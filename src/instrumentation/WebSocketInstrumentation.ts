import type { ResourceIdentity } from '../core';
import type {
  EventPublisher,
  WebSocketClosedEvent,
  WebSocketCreatedEvent,
} from '../events';
import { captureSourceLocation } from '../utils/SourceLocationCapture';
import type { Instrumentation } from './Instrumentation';

export class WebSocketInstrumentation implements Instrumentation {
  private readonly originalWebSocket = globalThis.WebSocket;
  private started = false;

  constructor(private readonly publisher: EventPublisher) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const OriginalWebSocket = this.originalWebSocket;
    const publisher = this.publisher;

    class PatchedWebSocket extends OriginalWebSocket {
      constructor(...args: ConstructorParameters<typeof OriginalWebSocket>) {
        super(...args);

        const resourceId = crypto.randomUUID() as ResourceIdentity;

        const createdEvent: WebSocketCreatedEvent = {
          id: crypto.randomUUID(),
          type: 'WebSocketCreated',
          timestamp: Date.now(),
          resourceId,
          url: args[0].toString(),
          sourceLocation: captureSourceLocation(),
        };

        publisher.publish(createdEvent);

        const originalClose = this.close;

        this.close = function (...closeArgs) {
          const closedEvent: WebSocketClosedEvent = {
            id: crypto.randomUUID(),
            type: 'WebSocketClosed',
            timestamp: Date.now(),
            resourceId,
          };

          publisher.publish(closedEvent);

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
