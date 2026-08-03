export type RuntimeEventId = string;

export type RuntimeEventType = 'WebSocketCreated' | 'WebSocketClosed';

export interface RuntimeEvent {
  readonly id: RuntimeEventId;

  readonly type: RuntimeEventType;

  readonly timestamp: number;
}
