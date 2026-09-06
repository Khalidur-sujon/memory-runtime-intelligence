import { WebSocketServer, type RawData, type WebSocket } from 'ws';

import type {
  RuntimeSnapshot,
  PersistedRuntimeSnapshot,
} from '../runtime/RuntimeSnapshot';

import { RuntimeStorage } from '../runtime/RuntimeStorage';

export class RuntimeCollector {
  private readonly port: number;

  private readonly storage: RuntimeStorage;

  private server: WebSocketServer | undefined;

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

    this.server = server;
  }

  async stop(): Promise<void> {
    if (!this.started || !this.server) {
      return;
    }

    this.started = false;

    const server = this.server;

    this.server = undefined;

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
    socket.on('message', (data) => {
      void this.handleSnapshot(data);
    });
  }

  private async handleSnapshot(data: RawData): Promise<void> {
    try {
      const snapshot = JSON.parse(data.toString()) as RuntimeSnapshot;

      const persistedSnapshot: PersistedRuntimeSnapshot = {
        ...snapshot,
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
}
