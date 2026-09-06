import { ResourceIdentity, SourceLocation } from '../../core';
import { ResourceOwner } from '../../core/Resource';
import { RuntimeEvent } from '../RuntimeEvents';

export interface TimerIntervalCreatedEvent extends RuntimeEvent {
  readonly type: 'TimerIntervalCreated';

  readonly resourceId: ResourceIdentity;

  readonly resourceGroupId: ResourceIdentity;

  readonly delay: number;

  readonly sourceLocation: SourceLocation;

  owner: ResourceOwner;
}
