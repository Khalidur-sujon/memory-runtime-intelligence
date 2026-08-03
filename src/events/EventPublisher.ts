import { RuntimeEvent } from './RuntimeEvents';

export interface EventPublisher {
  publish(event: RuntimeEvent): void;
}
