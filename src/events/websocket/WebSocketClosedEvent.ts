import type { ResourceIdentity } from '../../core';
import { RuntimeEvent } from '../RuntimeEvents';

export interface WebSocketClosedEvent extends RuntimeEvent {
  readonly type: 'WebSocketClosed';

  readonly resourceId: ResourceIdentity;
}
