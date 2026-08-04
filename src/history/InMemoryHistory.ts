import type { RuntimeEvent } from '../events';
import type { History } from './History';

export class InMemoryHistory implements History {
  private readonly events: RuntimeEvent[] = [];

  record(event: RuntimeEvent): void {
    this.events.push(event);
  }

  getEvents(): readonly RuntimeEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }
}
