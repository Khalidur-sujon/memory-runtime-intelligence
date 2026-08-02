import type { Resource, ResourceIdentity } from '../core';
import type { Registry } from '../registry';
import type { Instrumentation } from './Instrumentation';

export class WebSocketInstrumentation implements Instrumentation {
  private readonly originalWebSocket = globalThis.WebSocket;
  private started = false;

  constructor(private readonly registry: Registry) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const OriginalWebSocket = this.originalWebSocket;
    const registry = this.registry;

    class PatchedWebSocket extends OriginalWebSocket {
      constructor(...args: ConstructorParameters<typeof OriginalWebSocket>) {
        super(...args);

        const resource: Resource = {
          id: crypto.randomUUID() as ResourceIdentity,
          type: 'websocket',
          state: 'observed',
        };

        registry.register(resource);

        const originalClose = this.close;

        this.close = function (...closeArgs) {
          registry.release(resource.id);

          return originalClose.apply(this, closeArgs);
        };
      }
    }

    globalThis.WebSocket = PatchedWebSocket;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    globalThis.WebSocket = this.originalWebSocket;
  }
}
