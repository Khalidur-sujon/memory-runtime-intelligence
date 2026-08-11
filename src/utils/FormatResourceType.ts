import type { ResourceType } from '../core';

export function formatResourceType(type: ResourceType): string {
  switch (type) {
    case 'websocket':
      return 'WebSocket';

    case 'event-listener':
      return 'Event Listener';

    case 'timer':
      return 'Timer';

    default:
      return type;
  }
}
