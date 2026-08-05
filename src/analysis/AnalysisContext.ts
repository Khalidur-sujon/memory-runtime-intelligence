import type { Resource } from '../core';
import { History } from '../history';

export interface AnalysisContext {
  readonly resources: readonly Resource[];

  readonly history: History;
}
