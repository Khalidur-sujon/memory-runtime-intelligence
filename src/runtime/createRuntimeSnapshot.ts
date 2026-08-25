import { History } from '../history';
import type { Registry } from '../registry/Registry';
import type { RuntimeSnapshot } from './RuntimeSnapshot';

type CreateRuntimeSnapshotOptions = {
  registry: Registry;
  history: History;
  sessionId: string;
  startedAt: number;
};

export function createRuntimeSnapshot(
  options: CreateRuntimeSnapshotOptions,
): RuntimeSnapshot {
  return {
    sessionId: options.sessionId,
    pid: process.pid,
    startedAt: options.startedAt,
    updatedAt: Date.now(),
    resources: options.registry.list(),
    events: options.history.getEvents(),
  };
}
