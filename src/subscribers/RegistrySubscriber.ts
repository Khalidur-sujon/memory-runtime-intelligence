import type {
  RuntimeEvent,
  WebSocketCreatedEvent,
  WebSocketClosedEvent,
} from '../events';

import type { EventSubscriber } from '../events';
import type { Registry } from '../registry';
import type { Resource } from '../core';

export class RegistrySubscriber implements EventSubscriber {
  constructor(private readonly registry: Registry) {}

  handle(event: RuntimeEvent): void {
    switch (event.type) {
      case 'WebSocketCreated': {
        const websocketEvent = event as WebSocketCreatedEvent;

        const resource: Resource = {
          id: websocketEvent.resourceId,
          type: 'websocket',
          state: 'observed',
        };

        this.registry.register(resource);

        break;
      }

      case 'WebSocketClosed': {
        const websocketEvent = event as WebSocketClosedEvent;

        this.registry.release(websocketEvent.resourceId);

        break;
      }
    }
  }
}
