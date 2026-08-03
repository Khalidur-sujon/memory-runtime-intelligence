import type { RuntimeContext } from '../../context/RuntimeContext';
import type { WebSocketCreatedEvent, WebSocketClosedEvent } from '../../events';

export function runWebSocketLeakScenario(runtime: RuntimeContext): void {
  console.log('Running WebSocket lifecycle scenario...');

  const resourceId = 'websocket-demo-001';

  const createdEvent: WebSocketCreatedEvent = {
    type: 'WebSocketCreated',

    resourceId,

    id: resourceId,

    url: 'ws://example.com',

    timestamp: Date.now(),
  };

  runtime.getEventBus().publish(createdEvent);

  console.log('After WebSocketCreatedEvent');

  console.log(runtime.getRegistry());

  // const closedEvent: WebSocketClosedEvent = {
  //   type: 'WebSocketClosed',

  //   id: resourceId,

  //   resourceId,

  //   timestamp: Date.now(),
  // };

  // runtime.getEventBus().publish(closedEvent);

  // console.log('After WebSocketClosedEvent');

  // console.log(runtime.getRegistry());
}
