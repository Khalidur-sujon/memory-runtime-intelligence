import type { ResourceIdentity, SourceLocation } from '../core';

export interface Finding {
  readonly resourceId: ResourceIdentity;

  readonly message: string;

  readonly sourceLocation: SourceLocation;

  readonly details?: Readonly<Record<string, unknown>>;
}
