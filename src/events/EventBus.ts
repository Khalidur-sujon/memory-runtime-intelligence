import { EventPublisher } from './EventPublisher';
import { EventSubscriber } from './EventSubscriber';

export interface EventBus extends EventPublisher {
  subscribe(subscriber: EventSubscriber): void;

  unsubscribe(subscriber: EventSubscriber): void;
}
