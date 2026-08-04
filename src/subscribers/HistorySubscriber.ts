import { EventSubscriber, RuntimeEvent } from '../events';
import { History } from '../history';

export class HistorySubscriber implements EventSubscriber {
  constructor(private readonly history: History) {}

  handle(event: RuntimeEvent): void {
    this.history.record(event);
  }
}
