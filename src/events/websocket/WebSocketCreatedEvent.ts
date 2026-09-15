import type { ResourceIdentity, SourceLocation } from '../../core';
import { ResourceOwner } from '../../core/Resource';
import { RuntimeEvent } from '../RuntimeEvents';

export interface WebSocketCreatedEvent extends RuntimeEvent {
  readonly type: 'WebSocketCreated';

  readonly resourceId: ResourceIdentity;

  readonly resourceGroupId: ResourceIdentity;

  readonly url: string;

  readonly sourceLocation: SourceLocation;

  owner: ResourceOwner;
  scriptUrl?: string;
}
