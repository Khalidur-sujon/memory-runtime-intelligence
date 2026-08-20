import type { ResourceIdentity } from '../core';
import type { EventPublisher } from '../events';
import { EventListenerAddedEvent } from '../events/EventListener/EventListenerAddedEvent';
import { EventListenerRemovedEvent } from '../events/EventListener/EventListenerRemovedEvent';
import { createResourceGroupKey } from '../utils/ResourceGroupKey';
import { captureSourceLocation } from '../utils/SourceLocationCapture';
import type { Instrumentation } from './Instrumentation';

interface ListenerResource {
  resourceId: ResourceIdentity;
  resourceGroupId: ResourceIdentity;
}

export class EventListenerInstrumentation implements Instrumentation {
  private readonly originalAddEventListener =
    EventTarget.prototype.addEventListener;

  private readonly originalRemoveEventListener =
    EventTarget.prototype.removeEventListener;

  private started = false;

  /**
   * Tracks each actual event listener registration.
   *
   * EventTarget
   * listener
   * event type + capture
   * resource identity
   */

  private readonly listeners = new WeakMap<
    EventTarget,
    Map<EventListenerOrEventListenerObject, Map<string, ListenerResource>>
  >();

  /**
   * Tracks logical resource groups.
   *
   * groupKey -> resourceGroupId
   *
   * The same source location gets the same resourceGroupId
   * during the current runtime session.
   */

  private readonly resourceGroups = new Map<string, ResourceIdentity>();

  constructor(private readonly publisher: EventPublisher) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const originalAddEventListener = this.originalAddEventListener;
    const originalRemoveEventListener = this.originalRemoveEventListener;

    const publisher = this.publisher;
    const listeners = this.listeners;
    const resourceGroups = this.resourceGroups;

    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (listener) {
        let targetListeners = listeners.get(this);

        if (!targetListeners) {
          targetListeners = new Map();
          listeners.set(this, targetListeners);
        }

        let listenerRegistrations = targetListeners.get(listener);

        if (!listenerRegistrations) {
          listenerRegistrations = new Map();
          targetListeners.set(listener, listenerRegistrations);
        }

        const capture = getCapture(options);
        const registrationKey = createRegistrationKey(type, capture);

        /**
         * The browser does not create a duplicate registration
         * when the same listener is added with the same type
         * and capture value.
         */
        if (!listenerRegistrations.has(registrationKey)) {
          const resourceId = crypto.randomUUID() as ResourceIdentity;

          const sourceLocation = captureSourceLocation();

          /**
           * Same resource type + same source location
           * = same logical resource group.
           */
          const groupKey = createResourceGroupKey(
            'event-listener',
            sourceLocation,
          );

          let resourceGroupId = resourceGroups.get(groupKey);

          if (!resourceGroupId) {
            resourceGroupId = crypto.randomUUID() as ResourceIdentity;

            resourceGroups.set(groupKey, resourceGroupId);
          }

          listenerRegistrations.set(registrationKey, {
            resourceId,
            resourceGroupId,
          });

          const addedEvent: EventListenerAddedEvent = {
            id: crypto.randomUUID(),
            type: 'EventListenerAdded',
            timestamp: Date.now(),
            resourceId,
            resourceGroupId,
            target: this.constructor.name,
            eventType: type,
            sourceLocation,
          };

          publisher.publish(addedEvent);
        }
      }

      return originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      if (listener) {
        const targetListeners = listeners.get(this);
        const listenerRegistrations = targetListeners?.get(listener);

        const capture = getCapture(options);
        const registrationKey = createRegistrationKey(type, capture);

        const resource = listenerRegistrations?.get(registrationKey);
        if (listenerRegistrations && resource) {
          const removedEvent: EventListenerRemovedEvent = {
            id: crypto.randomUUID(),
            type: 'EventListenerRemoved',
            timestamp: Date.now(),
            resourceId: resource.resourceId,
            resourceGroupId: resource.resourceGroupId,
            target: this.constructor.name,
            eventType: type,
            sourceLocation: captureSourceLocation(),
          };

          publisher.publish(removedEvent);

          listenerRegistrations.delete(registrationKey);

          if (listenerRegistrations.size === 0) {
            targetListeners?.delete(listener);
          }
        }
      }

      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }
  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    EventTarget.prototype.addEventListener = this.originalAddEventListener;

    EventTarget.prototype.removeEventListener =
      this.originalRemoveEventListener;
  }
}

function createRegistrationKey(type: string, capture: boolean): string {
  return `${type}:${capture}`;
}

function getCapture(
  options?: boolean | AddEventListenerOptions | EventListenerOptions,
): boolean {
  return typeof options === 'boolean' ? options : (options?.capture ?? false);
}
