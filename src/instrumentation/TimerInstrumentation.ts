import type { ResourceIdentity } from '../core';

import type { EventPublisher } from '../events';

import { TimerIntervalCreatedEvent } from '../events/timer/TimerIntervalCreatedEvent';
import { TimerIntervalReleasedEvent } from '../events/timer/TimerIntervalReleasedEvent';

import { createResourceGroupKey } from '../utils/ResourceGroupKey';
import { captureSourceContext } from '../utils/SourceLocationCapture';

import type { Instrumentation } from './Instrumentation';
import { InstrumentationScope } from './InstrumentationScope';

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
   * The same source location gets the same
   * resourceGroupId during the current runtime session.
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

    const originalSetInterval = this.originalSetInterval;

    const originalClearInterval = this.originalClearInterval;

    const publisher = this.publisher;
    const scope = this.scope;
    const intervals = this.intervals;
    const resourceGroups = this.resourceGroups;

    /**
     * --------------------------------------------------
     * setInterval
     * --------------------------------------------------
     */
    globalThis.setInterval = ((...args: SetIntervalArgs) => {
      /**
       * Always create the real interval first.
       *
       * This preserves the native browser/runtime behavior.
       */
      const intervalId = originalSetInterval(...args);

      /**
       * Runtime internal interval.
       *
       * Do not track our own scheduler/internal timers.
       */
      if (scope.isInternal()) {
        return intervalId;
      }

      /**
       * Every actual application interval gets
       * a unique resourceId.
       */
      const resourceId = crypto.randomUUID() as ResourceIdentity;

      /**
       * Capture the complete stack and determine
       * ownership from the stack.
       *
       * IMPORTANT:
       * Do not use:
       *
       * captureSourceLocation()
       * determineResourceOwner()
       *
       * separately.
       */
      const { sourceLocation, owner, scriptUrl } = captureSourceContext();

      /**
       * Same resource type + same source location
       * = same logical resource group.
       */
      const groupKey = createResourceGroupKey('timer-interval', sourceLocation);

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

      /**
       * Track the actual interval instance.
       */
      intervals.set(intervalId, {
        resourceId,
        resourceGroupId,
      });

      /**
       * Publish creation event.
       */
      const createdEvent: TimerIntervalCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'TimerIntervalCreated',
        timestamp: Date.now(),
        resourceId,
        resourceGroupId,
        delay: extractDelay(args),
        sourceLocation,
        owner,
        scriptUrl,
      };

      publisher.publish(createdEvent);

      return intervalId;
    }) as typeof globalThis.setInterval;

    /**
     * --------------------------------------------------
     * clearInterval
     * --------------------------------------------------
     */

    globalThis.clearInterval = ((intervalId: IntervalHandle) => {
      const resource = intervals.get(intervalId);

      /**
       * If this interval belongs to an
       * application resource, publish release.
       */
      if (resource) {
        const releasedEvent: TimerIntervalReleasedEvent = {
          id: crypto.randomUUID(),
          type: 'TimerIntervalReleased',
          timestamp: Date.now(),
          resourceId: resource.resourceId,
          resourceGroupId: resource.resourceGroupId,
          sourceLocation: captureSourceContext().sourceLocation,
        };

        publisher.publish(releasedEvent);

        intervals.delete(intervalId);
      }

      /**
       * Always preserve native behavior.
       */
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

    /**
     * Restore native timer APIs.
     */
    globalThis.setInterval = this.originalSetInterval;

    globalThis.clearInterval = this.originalClearInterval;

    /**
     * Interval instances belong to this
     * runtime session.
     */
    this.intervals.clear();

    /**
     * Logical groups also belong to this
     * runtime session.
     */
    this.resourceGroups.clear();
  }
}

/**
 * Extracts the interval delay.
 *
 * setInterval accepts:
 *
 *   setInterval(callback, delay)
 *
 * and the delay can be omitted or non-numeric.
 *
 * Invalid / non-finite / negative values
 * are normalized to 0.
 */
function extractDelay(args: SetIntervalArgs): number {
  const delay = args[1];

  return typeof delay === 'number' && Number.isFinite(delay)
    ? Math.max(0, delay)
    : 0;
}
