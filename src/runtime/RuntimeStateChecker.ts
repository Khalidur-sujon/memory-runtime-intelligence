import { RuntimeStorage } from './RuntimeStorage';
import { RuntimeStaleDetector } from './RuntimeStaleDetector';

export class RuntimeStateChecker {
  private readonly storage: RuntimeStorage;
  private readonly staleDetector: RuntimeStaleDetector;

  constructor(storage: RuntimeStorage, staleDetector: RuntimeStaleDetector) {
    this.storage = storage;
    this.staleDetector = staleDetector;
  }

  async isStale(): Promise<boolean> {
    const snapshot = await this.storage.readSnapshot();

    if (!snapshot) {
      return false;
    }

    return !this.staleDetector.isProcessAlive(snapshot.pid);
  }
}
