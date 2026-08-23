import type { ResourceIdentity, SourceLocation } from '../../core';
import type { RuntimeEvent } from '../RuntimeEvents';

export interface ObserverStartedEvent extends RuntimeEvent {
  readonly type: 'ObserverStarted';

  readonly resourceId: ResourceIdentity;
  readonly resourceGroupId: ResourceIdentity;
  readonly observerType: 'mutation' | 'resize' | 'intersection';
  readonly target: string;
}
