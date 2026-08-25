import { Resource } from '../core';
import { RuntimeEvent } from '../events';

export type RuntimeSnapshot = {
  sessionId: string;
  pid: number;
  startedAt: number;
  updatedAt: number;
  resources: readonly Resource[];
  events: readonly RuntimeEvent[];
};
