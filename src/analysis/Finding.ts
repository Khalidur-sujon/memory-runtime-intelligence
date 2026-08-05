import type { ResourceIdentity, SourceLocation } from '../core';
import { Confidence } from './Confidence';

export interface Finding {
  readonly resourceId: ResourceIdentity;

  readonly message: string;

  readonly sourceLocation: SourceLocation;

  readonly confidence: Confidence;

  readonly recommendation: string;

  readonly details?: Readonly<Record<string, unknown>>;
}
