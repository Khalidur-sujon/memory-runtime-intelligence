import type { RuntimeEvent } from '../RuntimeEvents';

import type { EventSubscriber } from '../EventSubscriber';
import { EventBus } from '../EventBus';

export class InMemoryEventBus implements EventBus {
  private readonly subscribers = new Set<EventSubscriber>();

  public subscribe(subscriber: EventSubscriber): void {
    this.subscribers.add(subscriber);
  }

  public unsubscribe(subscriber: EventSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  public publish(event: RuntimeEvent): void {
    for (const subscriber of this.subscribers) {
      subscriber.handle(event);
    }
  }
}
