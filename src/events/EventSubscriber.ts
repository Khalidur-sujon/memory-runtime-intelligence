import { RuntimeEvent } from './RuntimeEvents';

export interface EventSubscriber {
  handle(event: RuntimeEvent): void;
}
