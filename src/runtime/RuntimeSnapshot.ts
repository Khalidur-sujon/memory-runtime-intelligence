import type { Resource } from '../core';

import type { RuntimeEvent } from '../events';

export type RuntimeSnapshot = {
  sessionId: string;

  startedAt: number;

  updatedAt: number;

  resources: readonly Resource[];

  events: readonly RuntimeEvent[];
};

export type PersistedRuntimeSnapshot = RuntimeSnapshot & {
  pid: number;
};
