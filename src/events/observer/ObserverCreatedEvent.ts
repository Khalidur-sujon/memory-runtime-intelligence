import type { ResourceIdentity, SourceLocation } from '../../core';
import type { RuntimeEvent } from '../RuntimeEvents';

export interface ObserverCreatedEvent extends RuntimeEvent {
  readonly type: 'ObserverCreated';

  readonly resourceId: ResourceIdentity;
  readonly resourceGroupId: ResourceIdentity;
  readonly observerType: 'mutation' | 'resize' | 'intersection';
  readonly sourceLocation: SourceLocation;
}
