import type {
  RuntimeEvent,
  WebSocketCreatedEvent,
  WebSocketClosedEvent,
} from '../events';

import type { EventSubscriber } from '../events';
import type { Registry } from '../registry';
import type { Resource } from '../core';
import { EventListenerAddedEvent } from '../events/EventListener/EventListenerAddedEvent';
import { EventListenerRemovedEvent } from '../events/EventListener/EventListenerRemovedEvent';
import { TimerIntervalCreatedEvent } from '../events/timer/EventListenerAddedEvent';
import { TimerIntervalReleasedEvent } from '../events/timer/EventListenerRemovedEvent';

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

      case 'EventListenerAdded': {
        const eventListenerEvent = event as EventListenerAddedEvent;

        const resource: Resource = {
          id: eventListenerEvent.resourceId,
          type: 'event-listener',
          state: 'observed',
        };

        this.registry.register(resource);

        break;
      }

      case 'EventListenerRemoved': {
        const eventListenerEvent = event as EventListenerRemovedEvent;

        this.registry.release(eventListenerEvent.resourceId);

        break;
      }

      case 'TimerIntervalCreated': {
        const timerEvent = event as TimerIntervalCreatedEvent;

        const resource: Resource = {
          id: timerEvent.resourceId,
          resourceGroupId: timerEvent.resourceGroupId,
          type: 'timer-interval',
          state: 'observed',
        };

        this.registry.register(resource);

        break;
      }

      case 'TimerIntervalReleased': {
        const timerEvent = event as TimerIntervalReleasedEvent;

        this.registry.release(timerEvent.resourceId);

        break;
      }
    }
  }
}
