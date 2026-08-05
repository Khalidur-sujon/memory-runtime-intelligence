import type { ResourceIdentity } from '../core';

export interface Finding {
  readonly resourceId: ResourceIdentity;

  readonly message: string;

  readonly details?: Readonly<Record<string, unknown>>;
}
