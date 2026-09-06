import type { RuntimeSnapshot } from './RuntimeSnapshot';

export interface RuntimeSnapshotTransport {
  send(snapshot: RuntimeSnapshot): Promise<void>;
}
