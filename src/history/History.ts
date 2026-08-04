import { RuntimeEvent } from '../events';

export interface History {
  record(event: RuntimeEvent): void;

  getEvents(): readonly RuntimeEvent[];

  clear(): void;
}
