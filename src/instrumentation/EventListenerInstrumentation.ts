import type { ResourceIdentity } from '../core';

import type { EventPublisher } from '../events';

import { EventListenerAddedEvent } from '../events/EventListener/EventListenerAddedEvent';

import { EventListenerRemovedEvent } from '../events/EventListener/EventListenerRemovedEvent';

import { createResourceGroupKey } from '../utils/ResourceGroupKey';

import { captureSourceContext } from '../utils/SourceLocationCapture';

import type { Instrumentation } from './Instrumentation';

import { InstrumentationScope } from './InstrumentationScope';

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
   * Tracks actual event listener registrations.
   *
   * EventTarget
   *   ↓
   * listener
   *   ↓
   * event type + capture
   *   ↓
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
   */
  private readonly resourceGroups = new Map<string, ResourceIdentity>();

  constructor(
    private readonly publisher: EventPublisher,
    private readonly scope: InstrumentationScope,
  ) {}

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
    const scope = this.scope;

    /**
     * --------------------------------------------------
     * addEventListener
     * --------------------------------------------------
     */
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListener | EventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      /**
       * Runtime internal operation.
       *
       * Do not instrument our own resource.
       */
      if (scope.isInternal()) {
        originalAddEventListener.call(this, type, listener, options);

        return;
      }

      /**
       * Browser allows null listeners.
       *
       * Nothing useful to track.
       */
      if (!listener) {
        originalAddEventListener.call(this, type, listener, options);

        return;
      }

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
       * Browser does not create a duplicate
       * registration for the same:
       *
       * listener + event type + capture
       */
      if (!listenerRegistrations.has(registrationKey)) {
        const resourceId = crypto.randomUUID() as ResourceIdentity;

        /**
         * IMPORTANT:
         *
         * Ownership comes from the COMPLETE stack.
         */
        const { sourceLocation, owner, scriptUrl } = captureSourceContext();

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
          owner,
          target: this.constructor.name,
          eventType: type,
          sourceLocation,
          scriptUrl,
        };

        publisher.publish(addedEvent);
      }

      /**
       * Always preserve native browser behavior.
       */
      originalAddEventListener.call(this, type, listener, options);
    };

    /**
     * --------------------------------------------------
     * removeEventListener
     * --------------------------------------------------
     */
    EventTarget.prototype.removeEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListener | EventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      /**
       * Runtime internal operation.
       */
      if (scope.isInternal()) {
        originalRemoveEventListener.call(this, type, listener, options);

        return;
      }

      if (!listener) {
        originalRemoveEventListener.call(this, type, listener, options);

        return;
      }

      const targetListeners = listeners.get(this);

      const listenerRegistrations = targetListeners?.get(listener);

      const capture = getCapture(options);

      const registrationKey = createRegistrationKey(type, capture);

      const resource = listenerRegistrations?.get(registrationKey);

      /**
       * If we know this exact registration,
       * publish its release.
       */
      if (listenerRegistrations && resource) {
        const removedEvent: EventListenerRemovedEvent = {
          id: crypto.randomUUID(),
          type: 'EventListenerRemoved',
          timestamp: Date.now(),
          resourceId: resource.resourceId,
          resourceGroupId: resource.resourceGroupId,
          target: this.constructor.name,
          eventType: type,
          sourceLocation: captureSourceContext().sourceLocation,
        };

        publisher.publish(removedEvent);

        listenerRegistrations.delete(registrationKey);

        if (listenerRegistrations.size === 0) {
          targetListeners?.delete(listener);
        }
      }

      /**
       * Always preserve native browser behavior.
       */
      originalRemoveEventListener.call(this, type, listener, options);
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

    this.resourceGroups.clear();
  }
}

/**
 * Creates the identity of a browser event
 * listener registration.
 *
 * Browser semantics:
 *
 * listener + type + capture
 */
function createRegistrationKey(type: string, capture: boolean): string {
  return `${type}:${capture}`;
}

/**
 * Normalizes AddEventListenerOptions and
 * EventListenerOptions to the actual capture flag.
 */
function getCapture(
  options?: boolean | AddEventListenerOptions | EventListenerOptions,
): boolean {
  return typeof options === 'boolean' ? options : (options?.capture ?? false);
}
