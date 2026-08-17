import type { ResourceIdentity } from '../core';
import type { EventPublisher } from '../events';
import { TimerIntervalCreatedEvent } from '../events/timer/EventListenerAddedEvent';
import { TimerIntervalReleasedEvent } from '../events/timer/EventListenerRemovedEvent';

import { captureSourceLocation } from '../utils/SourceLocationCapture';
import type { Instrumentation } from './Instrumentation';

type IntervalHandle = ReturnType<typeof globalThis.setInterval>;

type SetIntervalArgs = Parameters<typeof globalThis.setInterval>;

interface IntervalResource {
  resourceId: ResourceIdentity;
  resourceGroupId: ResourceIdentity;
}

export class TimerInstrumentation implements Instrumentation {
  private readonly originalSetInterval = globalThis.setInterval;

  private readonly originalClearInterval = globalThis.clearInterval;

  private started = false;

  /**
   * Tracks each actual runtime interval instance.
   *
   * intervalHandle -> resource identity
   */
  private readonly intervals = new Map<IntervalHandle, IntervalResource>();

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

    const originalSetInterval = this.originalSetInterval;
    const originalClearInterval = this.originalClearInterval;

    const publisher = this.publisher;
    const intervals = this.intervals;
    const resourceGroups = this.resourceGroups;

    globalThis.setInterval = ((...args: SetIntervalArgs) => {
      const intervalId = originalSetInterval(...args);

      /**
       * Every actual interval instance gets a unique resourceId.
       */
      const resourceId = crypto.randomUUID() as ResourceIdentity;

      /**
       * Capture the creation location once.
       *
       * This location is also used to determine the logical
       * resource group.
       */
      const sourceLocation = captureSourceLocation();

      /**
       * Same resource type + same source location
       * = same logical resource group.
       */
      const groupKey = createGroupKey(sourceLocation);

      let resourceGroupId = resourceGroups.get(groupKey);

      /**
       * First interval created from this location:
       * create a new logical group.
       *
       * Later intervals from the same location:
       * reuse the existing group id.
       */
      if (!resourceGroupId) {
        resourceGroupId = crypto.randomUUID() as ResourceIdentity;

        resourceGroups.set(groupKey, resourceGroupId);
      }

      intervals.set(intervalId, {
        resourceId,
        resourceGroupId,
      });

      const createdEvent: TimerIntervalCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'TimerIntervalCreated',
        timestamp: Date.now(),
        resourceId,
        resourceGroupId,
        delay: extractDelay(args),
        sourceLocation,
      };

      publisher.publish(createdEvent);

      return intervalId;
    }) as typeof globalThis.setInterval;

    globalThis.clearInterval = ((intervalId: IntervalHandle) => {
      const resource = intervals.get(intervalId);

      if (resource) {
        const releasedEvent: TimerIntervalReleasedEvent = {
          id: crypto.randomUUID(),
          type: 'TimerIntervalReleased',
          timestamp: Date.now(),
          resourceId: resource.resourceId,
          resourceGroupId: resource.resourceGroupId,
          sourceLocation: captureSourceLocation(),
        };

        publisher.publish(releasedEvent);

        intervals.delete(intervalId);
      }

      originalClearInterval(
        intervalId as Parameters<typeof globalThis.clearInterval>[0],
      );
    }) as typeof globalThis.clearInterval;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    globalThis.setInterval = this.originalSetInterval;

    globalThis.clearInterval = this.originalClearInterval;

    /**
     * Interval instances belong to this runtime session.
     */
    this.intervals.clear();

    /**
     * Logical groups also belong to this runtime session.
     * They should not leak into the next runtime session.
     */
    this.resourceGroups.clear();
  }
}

function createGroupKey(
  sourceLocation: ReturnType<typeof captureSourceLocation>,
): string {
  return `timer-interval:${JSON.stringify(sourceLocation)}`;
}

function extractDelay(args: SetIntervalArgs): number {
  const delay = args[1];

  return typeof delay === 'number' ? delay : 0;
}
