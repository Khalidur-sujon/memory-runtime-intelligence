import type { ResourceIdentity, SourceLocation } from '../../core';
import { RuntimeEvent } from '../RuntimeEvents';

export interface EventListenerRemovedEvent extends RuntimeEvent {
  readonly type: 'EventListenerRemoved';

  readonly resourceId: ResourceIdentity;

  readonly target: string;

  readonly eventType: string;

  readonly sourceLocation: SourceLocation;
}
