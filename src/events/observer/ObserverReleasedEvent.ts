import type { ResourceIdentity, SourceLocation } from '../../core';
import type { RuntimeEvent } from '../RuntimeEvents';

export interface ObserverReleasedEvent extends RuntimeEvent {
  readonly type: 'ObserverReleased';

  readonly resourceId: ResourceIdentity;
  readonly resourceGroupId: ResourceIdentity;
  readonly observerType: 'mutation' | 'resize' | 'intersection';
}
