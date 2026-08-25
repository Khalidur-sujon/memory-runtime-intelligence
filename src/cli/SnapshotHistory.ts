import type { RuntimeEvent } from '../events';
import type { History } from '../history';

export class SnapshotHistory implements History {
  constructor(private readonly events: readonly RuntimeEvent[]) {}

  record(_event: RuntimeEvent): void {
    throw new Error('SnapshotHistory is read-only.');
  }

  getEvents(): readonly RuntimeEvent[] {
    return this.events;
  }

  clear(): void {
    throw new Error('SnapshotHistory is read-only.');
  }
}
