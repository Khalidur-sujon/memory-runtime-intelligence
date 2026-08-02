import type { Resource } from '../core';

export interface AnalysisContext {
  readonly resources: readonly Resource[];
}
