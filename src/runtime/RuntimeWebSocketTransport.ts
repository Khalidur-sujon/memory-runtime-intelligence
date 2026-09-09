import { InstrumentationScope } from '../instrumentation/InstrumentationScope';
import type { RuntimeSnapshot } from './RuntimeSnapshot';
import type { RuntimeSnapshotTransport } from './RuntimeSnapshotTransport';

export class RuntimeWebSocketTransport implements RuntimeSnapshotTransport {
  private socket: WebSocket | undefined;

  constructor(
    private readonly scope: InstrumentationScope,
    private readonly url = 'ws://localhost:8787',
  ) {}

  async send(snapshot: RuntimeSnapshot): Promise<void> {
    const socket = this.getSocket();

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(snapshot));
      return;
    }

    if (socket.readyState === WebSocket.CONNECTING) {
      await this.waitForOpen(socket);

      socket.send(JSON.stringify(snapshot));
      return;
    }

    this.socket = undefined;
  }

  private getSocket(): WebSocket {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return this.socket;
    }

    // console.log('[runtime] Connecting to collector:', this.url);

    const socket = new WebSocket(this.url);

    this.socket = socket;

    return socket;
  }

  private waitForOpen(socket: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleOpen = () => {
        this.scope.enterInternal();

        try {
          cleanup();
          resolve();
        } finally {
          this.scope.exitInternal();
        }
      };

      const handleError = () => {
        this.scope.enterInternal();

        try {
          cleanup();

          reject(new Error('Runtime WebSocket connection failed.'));
        } finally {
          this.scope.exitInternal();
        }
      };

      const cleanup = () => {
        this.scope.enterInternal();

        try {
          socket.removeEventListener('open', handleOpen);
          socket.removeEventListener('error', handleError);
        } finally {
          this.scope.exitInternal();
        }
      };

      this.scope.enterInternal();

      try {
        socket.addEventListener('open', handleOpen);
        socket.addEventListener('error', handleError);
      } finally {
        this.scope.exitInternal();
      }
    });
  }
}
