import type { AnalysisContext } from '../AnalysisContext';
import type { Finding } from '../Finding';
import type { Rule } from '../Rule';

import type { WebSocketCreatedEvent, WebSocketClosedEvent } from '../../events';
import { ResourceType, SourceLocation } from '../../core';
import { Confidence } from '../Confidence';
import { EventListenerAddedEvent } from '../../events/EventListener/EventListenerAddedEvent';
import { EventListenerRemovedEvent } from '../../events/EventListener/EventListenerRemovedEvent';
import { TimerIntervalCreatedEvent } from '../../events/timer/EventListenerAddedEvent';
import { TimerIntervalReleasedEvent } from '../../events/timer/EventListenerRemovedEvent';

interface LifecycleCounter {
  created: number;
  released: number;

  // Logical group of the resource
  resourceGroupId: string;

  // Resource kind (websocket, timer, etc.)
  resourceType?: ResourceType;

  // First place where the resource was created
  sourceLocation?: SourceLocation;
}

export class ResourceLifecycleRule implements Rule {
  analyze(context: AnalysisContext): readonly Finding[] {
    const lifecycle = new Map<string, LifecycleCounter>();

    for (const event of context.history.getEvents()) {
      switch (event.type) {
        // case 'WebSocketCreated': {
        //   const createdEvent = event as WebSocketCreatedEvent;

        //   const counter = this.getCounter(lifecycle, createdEvent.resourceId);

        //   counter.created++;

        //   // Save once for later recommendations
        //   if (!counter.resourceType) {
        //     counter.resourceType = 'websocket';
        //   }

        //   // Keep the first creation location
        //   if (!counter.sourceLocation) {
        //     counter.sourceLocation = createdEvent.sourceLocation;
        //   }

        //   break;
        // }

        // case 'WebSocketClosed': {
        //   const closedEvent = event as WebSocketClosedEvent;

        //   const counter = this.getCounter(lifecycle, closedEvent.resourceId);

        //   counter.released++;

        //   break;
        // }

        // case 'EventListenerAdded': {
        //   const addedEvent = event as EventListenerAddedEvent;

        //   const counter = this.getCounter(lifecycle, addedEvent.resourceId);

        //   counter.created++;

        //   if (!counter.resourceType) {
        //     counter.resourceType = 'event-listener';
        //   }

        //   if (!counter.sourceLocation) {
        //     counter.sourceLocation = addedEvent.sourceLocation;
        //   }

        //   break;
        // }
        // case 'EventListenerRemoved': {
        //   const removedEvent = event as EventListenerRemovedEvent;

        //   const counter = this.getCounter(lifecycle, removedEvent.resourceId);

        //   counter.released++;

        //   break;
        // }

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

          if (!counter.sourceLocation) {
            counter.sourceLocation = createdEvent.sourceLocation;
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
      }
    }

    const findings: Finding[] = [];

    for (const [resourceGroupId, counter] of lifecycle) {
      const unreleased = counter.created - counter.released;

      if (counter.created > counter.released) {
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
    }

    return findings;
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
    // Number of unreleased resources
    const unreleased = counter.created - counter.released;

    if (unreleased > 1) {
      return Confidence.HIGH;
    }

    return Confidence.MEDIUM;
  }

  private getRecommendation(counter: LifecycleCounter): string {
    // Give a fix based on the resource type
    switch (counter.resourceType) {
      case 'websocket':
        return 'Call websocket.close() when the connection is no longer needed.';

      case 'event-listener':
        return 'Remove the event listener when it is no longer needed.';

      case 'timer-interval':
        return 'Call clearInterval() when the interval is no longer needed.';

      default:
        return 'Review the resource lifecycle and ensure it is properly released.';
    }
  }
}
