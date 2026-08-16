export type RuntimeEventId = string;

export type RuntimeEventType =
  | 'WebSocketCreated'
  | 'WebSocketClosed'
  | 'EventListenerAdded'
  | 'EventListenerRemoved'
  | 'TimerIntervalCreated'
  | 'TimerIntervalReleased';

export interface RuntimeEvent {
  readonly id: RuntimeEventId;

  readonly type: RuntimeEventType;

  readonly timestamp: number;
}
