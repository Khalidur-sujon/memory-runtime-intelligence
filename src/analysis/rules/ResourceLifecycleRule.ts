import type { AnalysisContext } from '../AnalysisContext';
import type { Finding } from '../Finding';
import type { Rule } from '../Rule';

import type { WebSocketCreatedEvent, WebSocketClosedEvent } from '../../events';
import { SourceLocation } from '../../core';

interface LifecycleCounter {
  created: number;
  released: number;

  sourceLocation?: SourceLocation;
}

export class ResourceLifecycleRule implements Rule {
  analyze(context: AnalysisContext): readonly Finding[] {
    const lifecycle = new Map<string, LifecycleCounter>();

    for (const event of context.history.getEvents()) {
      switch (event.type) {
        case 'WebSocketCreated': {
          const createdEvent = event as WebSocketCreatedEvent;

          const counter = this.getCounter(lifecycle, createdEvent.resourceId);

          counter.created++;

          if (!counter.sourceLocation) {
            counter.sourceLocation = createdEvent.sourceLocation;
          }

          break;
        }

        case 'WebSocketClosed': {
          const closedEvent = event as WebSocketClosedEvent;

          const counter = this.getCounter(lifecycle, closedEvent.resourceId);

          counter.released++;

          break;
        }
      }
    }

    const findings: Finding[] = [];

    for (const [resourceId, counter] of lifecycle) {
      if (counter.created > counter.released) {
        if (!counter.sourceLocation) {
          continue;
        }

        findings.push({
          resourceId,

          message: 'Potential Memory Retention.',

          details: {
            created: counter.created,
            released: counter.released,
          },

          sourceLocation: counter.sourceLocation,
        });
      }
    }

    return findings;
  }

  private getCounter(
    lifecycle: Map<string, LifecycleCounter>,
    resourceId: string,
  ): LifecycleCounter {
    let counter = lifecycle.get(resourceId);

    if (!counter) {
      counter = {
        created: 0,
        released: 0,
      };

      lifecycle.set(resourceId, counter);
    }

    return counter;
  }
}
