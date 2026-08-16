import { ResourceIdentity, SourceLocation } from '../../core';
import { RuntimeEvent } from '../RuntimeEvents';

export interface TimerIntervalReleasedEvent extends RuntimeEvent {
  readonly type: 'TimerIntervalReleased';

  readonly resourceId: ResourceIdentity;

  readonly sourceLocation: SourceLocation;
}
