import type {
  RuntimeEvent,
  WebSocketCreatedEvent,
  WebSocketClosedEvent,
} from '../events';

import type { EventSubscriber } from '../events';

import type { Registry } from '../registry';

import type { Resource } from '../core';

import type { EventListenerAddedEvent } from '../events/EventListener/EventListenerAddedEvent';
import type { EventListenerRemovedEvent } from '../events/EventListener/EventListenerRemovedEvent';

import type { TimerIntervalCreatedEvent } from '../events/timer/TimerIntervalCreatedEvent';
import type { TimerIntervalReleasedEvent } from '../events/timer/TimerIntervalReleasedEvent';

import type { ObserverCreatedEvent } from '../events/observer/ObserverCreatedEvent';
import type { ObserverStartedEvent } from '../events/observer/ObserverStartedEvent';
import type { ObserverReleasedEvent } from '../events/observer/ObserverReleasedEvent';

export class RegistrySubscriber implements EventSubscriber {
  constructor(private readonly registry: Registry) {}

  handle(event: RuntimeEvent): void {
    switch (event.type) {
      /**
       * --------------------------------------------------
       * WebSocket
       * --------------------------------------------------
       */
      case 'WebSocketCreated': {
        const websocketEvent = event as WebSocketCreatedEvent;

        const resource: Resource = {
          id: websocketEvent.resourceId,
          resourceGroupId: websocketEvent.resourceGroupId,
          type: 'websocket',
          state: 'observed',
          owner: websocketEvent.owner,
        };

        this.registerIfApplication(resource);

        break;
      }

      case 'WebSocketClosed': {
        const websocketEvent = event as WebSocketClosedEvent;

        this.registry.release(websocketEvent.resourceId);

        break;
      }

      /**
       * --------------------------------------------------
       * Event Listener
       * --------------------------------------------------
       */
      case 'EventListenerAdded': {
        const eventListenerEvent = event as EventListenerAddedEvent;

        const resource: Resource = {
          id: eventListenerEvent.resourceId,
          resourceGroupId: eventListenerEvent.resourceGroupId,
          type: 'event-listener',
          state: 'observed',
          owner: eventListenerEvent.owner,
        };

        this.registerIfApplication(resource);

        break;
      }

      case 'EventListenerRemoved': {
        const eventListenerEvent = event as EventListenerRemovedEvent;

        /**
         * release() is safe even when the resource was
         * not registered because it was framework/runtime.
         */
        this.registry.release(eventListenerEvent.resourceId);

        break;
      }

      /**
       * --------------------------------------------------
       * Timer Interval
       * --------------------------------------------------
       */
      case 'TimerIntervalCreated': {
        const timerEvent = event as TimerIntervalCreatedEvent;

        const resource: Resource = {
          id: timerEvent.resourceId,
          resourceGroupId: timerEvent.resourceGroupId,
          type: 'timer-interval',
          state: 'observed',
          owner: timerEvent.owner,
        };

        this.registerIfApplication(resource);

        break;
      }

      case 'TimerIntervalReleased': {
        const timerEvent = event as TimerIntervalReleasedEvent;

        this.registry.release(timerEvent.resourceId);

        break;
      }

      /**
       * --------------------------------------------------
       * Observer
       * --------------------------------------------------
       */
      case 'ObserverCreated': {
        const observerEvent = event as ObserverCreatedEvent;

        const resource: Resource = {
          id: observerEvent.resourceId,
          resourceGroupId: observerEvent.resourceGroupId,
          type: 'observer',
          state: 'observed',
          owner: observerEvent.owner,
        };

        this.registerIfApplication(resource);

        break;
      }

      case 'ObserverStarted': {
        const observerEvent = event as ObserverStartedEvent;

        /**
         * ObserverStarted does not create a new resource.
         *
         * The resource was already registered by
         * ObserverCreated.
         */
        void observerEvent;

        break;
      }

      case 'ObserverReleased': {
        const observerEvent = event as ObserverReleasedEvent;

        this.registry.release(observerEvent.resourceId);

        break;
      }
    }
  }

  /**
   * --------------------------------------------------
   * Application Resource Boundary
   * --------------------------------------------------
   *
   * active.json represents developer/application-owned
   * active resources.
   *
   * Framework and runtime resources are intentionally
   * excluded from the Registry.
   */
  private registerIfApplication(resource: Resource): void {
    if (resource.owner !== 'application') {
      return;
    }

    this.registry.register(resource);
  }
}
