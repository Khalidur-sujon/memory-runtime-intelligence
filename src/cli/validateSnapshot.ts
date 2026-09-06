import type { PersistedRuntimeSnapshot } from '../runtime/RuntimeSnapshot';

export function isRuntimeSnapshot(
  value: unknown,
): value is PersistedRuntimeSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as Record<string, unknown>;

  /**
   * Validate snapshot-level fields.
   */
  if (
    typeof snapshot.sessionId !== 'string' ||
    typeof snapshot.pid !== 'number' ||
    typeof snapshot.startedAt !== 'number' ||
    typeof snapshot.updatedAt !== 'number' ||
    !Array.isArray(snapshot.resources) ||
    !Array.isArray(snapshot.events)
  ) {
    console.error('[Memory Runtime] Invalid snapshot metadata.');

    return false;
  }

  /**
   * Validate every runtime resource.
   *
   * resourceGroupId is intentionally mandatory.
   */
  for (const [index, resource] of snapshot.resources.entries()) {
    if (typeof resource !== 'object' || resource === null) {
      console.error('[Memory Runtime] Invalid resource:', {
        index,
        resource,
      });

      return false;
    }

    const item = resource as Record<string, unknown>;

    if (typeof item.id !== 'string') {
      console.error('[Memory Runtime] Resource is missing a valid id:', {
        index,
        resource,
      });

      return false;
    }

    if (typeof item.resourceGroupId !== 'string') {
      console.error(
        '[Memory Runtime] Resource is missing a valid resourceGroupId:',
        {
          index,
          resource,
        },
      );

      return false;
    }

    if (typeof item.type !== 'string') {
      console.error('[Memory Runtime] Resource is missing a valid type:', {
        index,
        resource,
      });

      return false;
    }

    if (typeof item.state !== 'string') {
      console.error('[Memory Runtime] Resource is missing a valid state:', {
        index,
        resource,
      });

      return false;
    }
  }

  return true;
}
