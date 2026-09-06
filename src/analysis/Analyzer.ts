import type { AnalysisContext } from './AnalysisContext';
import type { Finding } from './Finding';
import type { Rule } from './Rule';
import { SnapshotHistory } from '../cli/SnapshotHistory';

import type { RuntimeEvent } from '../events';

import type { WebSocketCreatedEvent, WebSocketClosedEvent } from '../events';
import { EventListenerAddedEvent } from '../events/EventListener/EventListenerAddedEvent';
import { EventListenerRemovedEvent } from '../events/EventListener/EventListenerRemovedEvent';
import { TimerIntervalCreatedEvent } from '../events/timer/TimerIntervalCreatedEvent';
import { TimerIntervalReleasedEvent } from '../events/timer/TimerIntervalReleasedEvent';
import { ObserverCreatedEvent } from '../events/observer/ObserverCreatedEvent';
import { ObserverStartedEvent } from '../events/observer/ObserverStartedEvent';
import { ObserverReleasedEvent } from '../events/observer/ObserverReleasedEvent';

export class Analyzer {
  constructor(private readonly rules: readonly Rule[]) {}

  analyze(context: AnalysisContext): Finding[] {
    const developerResources = context.resources.filter(
      (resource) => resource.owner === 'application',
    );

    const developerResourceGroupIds = new Set(
      developerResources.map((resource) => resource.resourceGroupId),
    );

    const developerEvents = context.history.getEvents().filter((event) => {
      const resourceGroupId = getResourceGroupId(event);

      return (
        resourceGroupId !== undefined &&
        developerResourceGroupIds.has(resourceGroupId)
      );
    });

    const developerContext: AnalysisContext = {
      resources: developerResources,
      history: new SnapshotHistory(developerEvents),
    };

    return this.rules.flatMap((rule) => rule.analyze(developerContext));
  }
}

function getResourceGroupId(event: RuntimeEvent): string | undefined {
  switch (event.type) {
    case 'WebSocketCreated':
      return (event as WebSocketCreatedEvent).resourceGroupId;

    case 'WebSocketClosed':
      return (event as WebSocketClosedEvent).resourceGroupId;

    case 'EventListenerAdded':
      return (event as EventListenerAddedEvent).resourceGroupId;

    case 'EventListenerRemoved':
      return (event as EventListenerRemovedEvent).resourceGroupId;

    case 'TimerIntervalCreated':
      return (event as TimerIntervalCreatedEvent).resourceGroupId;

    case 'TimerIntervalReleased':
      return (event as TimerIntervalReleasedEvent).resourceGroupId;

    case 'ObserverCreated':
      return (event as ObserverCreatedEvent).resourceGroupId;

    case 'ObserverStarted':
      return (event as ObserverStartedEvent).resourceGroupId;

    case 'ObserverReleased':
      return (event as ObserverReleasedEvent).resourceGroupId;

    default:
      return undefined;
  }
}
