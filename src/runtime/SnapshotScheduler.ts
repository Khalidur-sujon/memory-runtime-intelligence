import { History } from '../history';
import type { Registry } from '../registry/Registry';
import { createRuntimeSnapshot } from './createRuntimeSnapshot';
import type { RuntimeStorage } from './RuntimeStorage';

export class SnapshotScheduler {
  private readonly registry: Registry;
  private readonly history: History;
  private readonly storage: RuntimeStorage;
  private readonly sessionId: string;
  private readonly startedAt: number;

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    registry: Registry,
    history: History,
    storage: RuntimeStorage,
    sessionId: string,
    startedAt: number,
  ) {
    this.registry = registry;
    this.history = history;
    this.storage = storage;
    this.sessionId = sessionId;
    this.startedAt = startedAt;
  }

  start(): void {
    if (this.timer !== undefined) {
      return;
    }

    this.timer = setInterval(() => {
      void this.persistSnapshot();
    }, 1000);
  }

  stop(): void {
    if (this.timer === undefined) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async persistSnapshot(): Promise<void> {
    const snapshot = createRuntimeSnapshot({
      registry: this.registry,
      history: this.history,
      sessionId: this.sessionId,
      startedAt: this.startedAt,
    });

    await this.storage.writeSnapshot(snapshot);
  }
}
