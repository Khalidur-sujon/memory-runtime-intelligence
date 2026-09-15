import type { AnalysisContext } from '../AnalysisContext';
import type { Finding } from '../Finding';
import type { Rule } from '../Rule';

import type { WebSocketCreatedEvent, WebSocketClosedEvent } from '../../events';

import { ResourceType, SourceLocation } from '../../core';
import { Confidence } from '../Confidence';

import type { EventListenerAddedEvent } from '../../events/EventListener/EventListenerAddedEvent';
import type { EventListenerRemovedEvent } from '../../events/EventListener/EventListenerRemovedEvent';

import type { TimerIntervalCreatedEvent } from '../../events/timer/TimerIntervalCreatedEvent';
import type { TimerIntervalReleasedEvent } from '../../events/timer/TimerIntervalReleasedEvent';

import type { ObserverReleasedEvent } from '../../events/observer/ObserverReleasedEvent';
import type { ObserverStartedEvent } from '../../events/observer/ObserverStartedEvent';
import type { ObserverCreatedEvent } from '../../events/observer/ObserverCreatedEvent';

interface LifecycleCounter {
  created: number;
  released: number;

  // Logical group of the resource
  resourceGroupId: string;

  // Resource kind (websocket, timer, etc.)
  resourceType?: ResourceType;

  // First resolved source location where the resource was created
  sourceLocation?: SourceLocation;
}

export class ResourceLifecycleRule implements Rule {
  analyze(context: AnalysisContext): readonly Finding[] {
    /**
     * Resources contain the enriched source location after
     * source-map resolution.
     *
     * Events contain the raw/generated runtime location.
     *
     * Therefore:
     * - history -> lifecycle counting
     * - resources -> developer-facing source location
     */
    const resourceById = new Map(
      context.resources.map((resource) => [resource.id, resource]),
    );

    const lifecycle = new Map<string, LifecycleCounter>();

    for (const event of context.history.getEvents()) {
      switch (event.type) {
        case 'WebSocketCreated': {
          const createdEvent = event as WebSocketCreatedEvent;

          const counter = this.getCounter(
            lifecycle,
            createdEvent.resourceGroupId,
          );

          counter.created++;

          if (!counter.resourceType) {
            counter.resourceType = 'websocket';
          }

          /**
           * Use the enriched resource location instead of the
           * generated event location.
           */
          if (!counter.sourceLocation) {
            counter.sourceLocation = this.getResourceSourceLocation(
              resourceById,
              createdEvent.resourceId,
            );
          }

          break;
        }

        case 'WebSocketClosed': {
          const closedEvent = event as WebSocketClosedEvent;

          const counter = this.getCounter(
            lifecycle,
            closedEvent.resourceGroupId,
          );

          counter.released++;

          break;
        }

        case 'EventListenerAdded': {
          const addedEvent = event as EventListenerAddedEvent;

          const counter = this.getCounter(
            lifecycle,
            addedEvent.resourceGroupId,
          );

          counter.created++;

          if (!counter.resourceType) {
            counter.resourceType = 'event-listener';
          }

          /**
           * Use the resolved source location stored on the resource.
           */
          if (!counter.sourceLocation) {
            counter.sourceLocation = this.getResourceSourceLocation(
              resourceById,
              addedEvent.resourceId,
            );
          }

          break;
        }

        case 'EventListenerRemoved': {
          const removedEvent = event as EventListenerRemovedEvent;

          const counter = this.getCounter(
            lifecycle,
            removedEvent.resourceGroupId,
          );

          counter.released++;

          break;
        }

        case 'TimerIntervalCreated': {
          const createdEvent = event as TimerIntervalCreatedEvent;

          const counter = this.getCounter(
            lifecycle,
            createdEvent.resourceGroupId,
          );

          counter.created++;

          if (!counter.resourceType) {
            counter.resourceType = 'timer-interval';
          }

          /**
           * Use the resolved source location stored on the resource.
           */
          if (!counter.sourceLocation) {
            counter.sourceLocation = this.getResourceSourceLocation(
              resourceById,
              createdEvent.resourceId,
            );
          }

          break;
        }

        case 'TimerIntervalReleased': {
          const releasedEvent = event as TimerIntervalReleasedEvent;

          const counter = this.getCounter(
            lifecycle,
            releasedEvent.resourceGroupId,
          );

          counter.released++;

          break;
        }

        case 'ObserverCreated': {
          const createdEvent = event as ObserverCreatedEvent;

          const counter = this.getCounter(
            lifecycle,
            createdEvent.resourceGroupId,
          );

          counter.created++;

          if (!counter.resourceType) {
            counter.resourceType = 'observer';
          }

          if (!counter.sourceLocation) {
            counter.sourceLocation = this.getResourceSourceLocation(
              resourceById,
              createdEvent.resourceId,
            );
          }

          break;
        }

        case 'ObserverStarted': {
          // Starting/observing does not create a new resource.
          break;
        }

        case 'ObserverReleased': {
          const releasedEvent = event as ObserverReleasedEvent;

          const counter = this.getCounter(
            lifecycle,
            releasedEvent.resourceGroupId,
          );

          counter.released++;

          break;
        }
      }
    }

    const findings: Finding[] = [];

    for (const [resourceGroupId, counter] of lifecycle) {
      const unreleased = counter.created - counter.released;

      if (counter.created <= counter.released) {
        continue;
      }

      /**
       * Without a resolved source location we cannot provide
       * a useful developer-facing finding.
       */
      if (!counter.sourceLocation) {
        continue;
      }

      findings.push({
        resourceGroupId,
        resourceType: counter.resourceType!,
        message: 'Potential Memory Retention.',
        confidence: this.calculateConfidence(counter),
        recommendation: this.getRecommendation(counter),
        details: {
          created: counter.created,
          released: counter.released,
          unreleased,
        },
        sourceLocation: counter.sourceLocation,
      });
    }

    return findings;
  }

  /**
   * Returns the source location stored on the enriched resource.
   *
   * This location has already gone through source-map resolution.
   */
  private getResourceSourceLocation(
    resourceById: Map<string, AnalysisContext['resources'][number]>,
    resourceId: string,
  ): SourceLocation | undefined {
    return resourceById.get(resourceId)?.sourceLocation;
  }

  private getCounter(
    lifecycle: Map<string, LifecycleCounter>,
    resourceGroupId: string,
  ): LifecycleCounter {
    let counter = lifecycle.get(resourceGroupId);

    if (!counter) {
      counter = {
        created: 0,
        released: 0,
        resourceGroupId,
      };

      lifecycle.set(resourceGroupId, counter);
    }

    return counter;
  }

  private calculateConfidence(counter: LifecycleCounter): Confidence {
    const unreleased = counter.created - counter.released;

    if (unreleased > 1) {
      return Confidence.HIGH;
    }

    return Confidence.MEDIUM;
  }

  private getRecommendation(counter: LifecycleCounter): string {
    switch (counter.resourceType) {
      case 'websocket':
        return 'Call websocket.close() when the connection is no longer needed.';

      case 'event-listener':
        return 'Remove the event listener when it is no longer needed.';

      case 'timer-interval':
        return 'Call clearInterval() when the interval is no longer needed.';

      case 'observer':
        return 'Call observer.disconnect() when the observer is no longer needed.';

      default:
        return 'Review the resource lifecycle and ensure it is properly released.';
    }
  }
}
