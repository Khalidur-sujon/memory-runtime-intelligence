import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { loadSourceMap } from '../runtime/source-map/SourceMapLoader';
import {
  resolveGeneratedLocation,
  type GeneratedLocation,
} from '../runtime/source-map/SourceMapResolver';

import type {
  RuntimeSnapshot,
  PersistedRuntimeSnapshot,
} from '../runtime/RuntimeSnapshot';

import { RuntimeStorage } from '../runtime/RuntimeStorage';

export class RuntimeCollector {
  private readonly port: number;

  private readonly storage: RuntimeStorage;

  private server: WebSocketServer | undefined;

  private readonly sockets = new Set<WebSocket>();
  private readonly sourceMapCache = new Map<string, Promise<unknown | null>>();

  private started = false;

  constructor(port = 8787, projectRoot = process.cwd()) {
    this.port = port;

    this.storage = new RuntimeStorage(projectRoot);
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const server = new WebSocketServer({
      port: this.port,
    });

    server.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    server.on('listening', () => {
      this.started = true;
      this.server = server;

      console.log(`[MRI] Runtime collector listening on :${this.port}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`[MRI] Unable to start WebSocket server on :${this.port}`);

        console.warn(`[MRI] Port ${this.port} is already in use.`);

        console.warn('[MRI] Another MRI/Vite process may still be suspended.');

        console.warn(
          '[MRI] If you suspended the previous dev server with Ctrl+Z,',
        );

        console.warn('      resume/terminate that job first.');

        console.warn('[MRI] To find the process using this port:');

        console.warn(`      lsof -nP -iTCP:${this.port} -sTCP:LISTEN`);

        console.warn('[MRI] Then terminate the process:');

        console.warn('      kill <PID>');

        console.warn('[MRI] If the process does not terminate, force kill it:');

        console.warn('      kill -9 <PID>');

        return;
      }

      console.error('[MRI] WebSocket server error:', error);
    });

    this.server = server;
  }

  async stop(): Promise<void> {
    if (!this.started || !this.server) {
      return;
    }

    this.started = false;

    const server = this.server;

    this.server = undefined;

    // Close all active browser WebSocket connections first.
    for (const socket of this.sockets) {
      try {
        socket.close();
      } catch {
        // Ignore socket shutdown errors.
      }
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private handleConnection(socket: WebSocket): void {
    this.sockets.add(socket);

    socket.on('message', (data) => {
      void this.handleSnapshot(data);
    });
    socket.on('close', () => {
      this.sockets.delete(socket);
    });

    socket.on('error', () => {
      this.sockets.delete(socket);
    });
  }

  private async handleSnapshot(data: RawData): Promise<void> {
    try {
      const snapshot = JSON.parse(data.toString()) as RuntimeSnapshot;

      const enrichedSnapshot = await this.enrichSnapshot(snapshot);

      const persistedSnapshot: PersistedRuntimeSnapshot = {
        // ...snapshot,
        ...enrichedSnapshot,
        pid: process.pid,
      };

      await this.storage.writeSnapshot(persistedSnapshot);
    } catch (error) {
      console.error(
        '[memory-runtime-intelligence] Failed to persist runtime snapshot:',
        error,
      );
    }
  }

  private async enrichSnapshot(
    snapshot: RuntimeSnapshot,
  ): Promise<RuntimeSnapshot> {
    const sourceLocations = new Map<
      string,
      {
        file: string;
        line: number;
        column: number;
        scriptUrl?: string;
      }
    >();

    for (const event of snapshot.events) {
      if (!this.isResourceSourceEvent(event)) continue;

      sourceLocations.set(event.resourceId, {
        file: event.sourceLocation.file,
        line: event.sourceLocation.line,
        column: event.sourceLocation.column,
        scriptUrl: event.scriptUrl,
      });
    }

    const resources = await Promise.all(
      snapshot.resources.map(async (resource) => {
        const generatedLocation = sourceLocations.get(resource.id);

        if (!generatedLocation) {
          return resource;
        }

        // No script URL → cannot resolve source map.
        if (!generatedLocation.scriptUrl) {
          return {
            ...resource,
            sourceLocation: {
              file: generatedLocation.file,
              line: generatedLocation.line,
              column: generatedLocation.column,
            },
          };
        }

        const sourceMap = await this.loadCachedSourceMap(
          generatedLocation.scriptUrl,
        );

        if (!sourceMap) {
          return {
            ...resource,
            sourceLocation: {
              file: generatedLocation.file,
              line: generatedLocation.line,
              column: generatedLocation.column,
            },
          };
        }

        const resolvedLocation = resolveGeneratedLocation(sourceMap, {
          file: generatedLocation.file,
          line: generatedLocation.line,
          column: generatedLocation.column,
        });

        return {
          ...resource,
          sourceLocation: resolvedLocation ?? {
            file: generatedLocation.file,
            line: generatedLocation.line,
            column: generatedLocation.column,
          },
        };
      }),
    );

    return {
      ...snapshot,
      resources,
    };
  }
  private isResourceSourceEvent(
    event: RuntimeSnapshot['events'][number],
  ): event is RuntimeSnapshot['events'][number] & {
    resourceId: string;

    sourceLocation: {
      file: string;
      line: number;
      column: number;
    };

    scriptUrl?: string;
  } {
    return (
      'resourceId' in event &&
      typeof event.resourceId === 'string' &&
      'sourceLocation' in event &&
      event.sourceLocation !== null &&
      typeof event.sourceLocation === 'object' &&
      'file' in event.sourceLocation &&
      'line' in event.sourceLocation &&
      'column' in event.sourceLocation
    );
  }
  private loadCachedSourceMap(scriptUrl: string): Promise<unknown | null> {
    const cached = this.sourceMapCache.get(scriptUrl);

    if (cached) {
      return cached;
    }

    const promise = loadSourceMap(scriptUrl);

    this.sourceMapCache.set(scriptUrl, promise);

    return promise;
  }
}
