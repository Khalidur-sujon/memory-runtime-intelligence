import type { ResourceIdentity } from '../core';
import type { EventPublisher } from '../events';
import { TimerIntervalCreatedEvent } from '../events/timer/EventListenerAddedEvent';
import { TimerIntervalReleasedEvent } from '../events/timer/EventListenerRemovedEvent';

import { captureSourceLocation } from '../utils/SourceLocationCapture';
import type { Instrumentation } from './Instrumentation';

type IntervalHandle = ReturnType<typeof globalThis.setInterval>;

type SetIntervalArgs = Parameters<typeof globalThis.setInterval>;

export class TimerInstrumentation implements Instrumentation {
  private readonly originalSetInterval = globalThis.setInterval;

  private readonly originalClearInterval = globalThis.clearInterval;

  private started = false;

  private readonly intervals = new Map<IntervalHandle, ResourceIdentity>();

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

    globalThis.setInterval = ((...args: SetIntervalArgs) => {
      const intervalId = originalSetInterval(...args);

      const resourceId = crypto.randomUUID() as ResourceIdentity;

      intervals.set(intervalId, resourceId);

      const createdEvent: TimerIntervalCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'TimerIntervalCreated',
        timestamp: Date.now(),
        resourceId,
        delay: extractDelay(args),
        sourceLocation: captureSourceLocation(),
      };

      publisher.publish(createdEvent);

      return intervalId;
    }) as typeof globalThis.setInterval;

    globalThis.clearInterval = ((intervalId: IntervalHandle) => {
      const resourceId = intervals.get(intervalId);

      if (resourceId) {
        const releasedEvent: TimerIntervalReleasedEvent = {
          id: crypto.randomUUID(),
          type: 'TimerIntervalReleased',
          timestamp: Date.now(),
          resourceId,
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

    this.intervals.clear();
  }
}

function extractDelay(args: SetIntervalArgs): number {
  const delay = args[1];

  return typeof delay === 'number' ? delay : 0;
}
