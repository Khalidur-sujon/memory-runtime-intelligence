import { RuntimeSnapshot } from '../runtime/RuntimeSnapshot';

export function isRuntimeSnapshot(value: unknown): value is RuntimeSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as Record<string, unknown>;

  if (
    typeof snapshot.sessionId !== 'string' ||
    typeof snapshot.pid !== 'number' ||
    typeof snapshot.startedAt !== 'number' ||
    typeof snapshot.updatedAt !== 'number' ||
    !Array.isArray(snapshot.resources) ||
    !Array.isArray(snapshot.events)
  ) {
    return false;
  }

  return snapshot.resources.every((resource) => {
    if (typeof resource !== 'object' || resource === null) {
      return false;
    }

    const item = resource as Record<string, unknown>;

    return (
      typeof item.id === 'string' &&
      typeof item.resourceGroupId === 'string' &&
      typeof item.type === 'string' &&
      typeof item.state === 'string'
    );
  });
}
