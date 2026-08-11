import type { ResourceIdentity } from '../core';
import type { EventPublisher } from '../events';
import { EventListenerAddedEvent } from '../events/EventListener/EventListenerAddedEvent';
import { EventListenerRemovedEvent } from '../events/EventListener/EventListenerRemovedEvent';
import { captureSourceLocation } from '../utils/SourceLocationCapture';
import type { Instrumentation } from './Instrumentation';

export class EventListenerInstrumentation implements Instrumentation {
  private readonly originalAddEventListener =
    EventTarget.prototype.addEventListener;

  private readonly originalRemoveEventListener =
    EventTarget.prototype.removeEventListener;

  private started = false;

  private readonly listeners = new WeakMap<
    EventTarget,
    Map<EventListenerOrEventListenerObject, ResourceIdentity>
  >();

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

        const resourceId = crypto.randomUUID() as ResourceIdentity;

        targetListeners.set(listener, resourceId);

        const addedEvent: EventListenerAddedEvent = {
          id: crypto.randomUUID(),
          type: 'EventListenerAdded',
          timestamp: Date.now(),
          resourceId,
          target: this.constructor.name,
          eventType: type,
          sourceLocation: captureSourceLocation(),
        };

        publisher.publish(addedEvent);
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
        const resourceId = targetListeners?.get(listener);

        if (resourceId) {
          const removedEvent: EventListenerRemovedEvent = {
            id: crypto.randomUUID(),
            type: 'EventListenerRemoved',
            timestamp: Date.now(),
            resourceId,
            target: this.constructor.name,
            eventType: type,
            sourceLocation: captureSourceLocation(),
          };

          publisher.publish(removedEvent);

          targetListeners?.delete(listener);
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
