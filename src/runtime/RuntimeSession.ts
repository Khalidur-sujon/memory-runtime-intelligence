import { RuntimeSessionState } from './RuntimeSessionState';

export class RuntimeSession {
  private readonly sessionId: string;
  private readonly startedAt: number;

  private state: RuntimeSessionState = 'created';

  constructor() {
    this.sessionId = crypto.randomUUID();
    this.startedAt = Date.now();
  }

  start(): void {
    if (this.state !== 'created') {
      throw new Error(`Cannot start session from state: ${this.state}`);
    }

    this.state = 'active';
  }

  reset(): void {
    if (this.state !== 'active') {
      throw new Error(`Cannot reset session from state: ${this.state}`);
    }

    this.state = 'reset';
  }

  shutdown(): void {
    if (this.state === 'shutdown') {
      return;
    }

    this.state = 'shutdown';
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getStartedAt(): number {
    return this.startedAt;
  }

  getState(): RuntimeSessionState {
    return this.state;
  }
}
