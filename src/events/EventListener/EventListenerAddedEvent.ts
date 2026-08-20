import type { ResourceIdentity, SourceLocation } from '../../core';
import { RuntimeEvent } from '../RuntimeEvents';

export interface EventListenerAddedEvent extends RuntimeEvent {
  readonly type: 'EventListenerAdded';

  readonly resourceId: ResourceIdentity;

  readonly resourceGroupId: ResourceIdentity;

  readonly target: string;

  readonly eventType: string;

  readonly sourceLocation: SourceLocation;
}
