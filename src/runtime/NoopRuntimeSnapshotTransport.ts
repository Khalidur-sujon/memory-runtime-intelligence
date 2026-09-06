import type { RuntimeSnapshot } from './RuntimeSnapshot';
import type { RuntimeSnapshotTransport } from './RuntimeSnapshotTransport';

export class NoopRuntimeSnapshotTransport implements RuntimeSnapshotTransport {
  async send(_snapshot: RuntimeSnapshot): Promise<void> {
    // Intentionally does nothing.
  }
}
