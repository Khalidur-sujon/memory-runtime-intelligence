import type { ResourceIdentity, ResourceType, SourceLocation } from '../core';
import { Confidence } from './Confidence';

export interface Finding {
  readonly resourceId: ResourceIdentity;

  resourceType: ResourceType;

  readonly message: string;

  readonly sourceLocation: SourceLocation;

  readonly confidence: Confidence;

  readonly recommendation: string;

  readonly details?: Readonly<Record<string, unknown>>;
}
