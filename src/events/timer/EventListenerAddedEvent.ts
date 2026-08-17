import { ResourceIdentity, SourceLocation } from '../../core';
import { RuntimeEvent } from '../RuntimeEvents';

export interface TimerIntervalCreatedEvent extends RuntimeEvent {
  readonly type: 'TimerIntervalCreated';

  readonly resourceId: ResourceIdentity;

  readonly resourceGroupId: ResourceIdentity;

  readonly delay: number;

  readonly sourceLocation: SourceLocation;
}
