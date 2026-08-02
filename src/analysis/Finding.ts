import type { ResourceIdentity } from '../core';

export interface Finding {
  readonly resourceId: ResourceIdentity;

  readonly message: string;
}
