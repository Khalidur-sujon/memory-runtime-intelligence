import type { ResourceIdentity } from '../../core';
import { RuntimeEvent } from '../RuntimeEvents';

export interface WebSocketCreatedEvent extends RuntimeEvent {
  readonly type: 'WebSocketCreated';

  readonly resourceId: ResourceIdentity;

  readonly url: string;
}
