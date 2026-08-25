import type { RuntimeContext } from '../context/RuntimeContext';

export class RuntimeShutdown {
  private readonly runtime: RuntimeContext;

  private shuttingDown = false;

  constructor(runtime: RuntimeContext) {
    this.runtime = runtime;
  }

  register(): void {
    process.once('SIGINT', () => {
      void this.shutdown();
    });

    process.once('SIGTERM', () => {
      void this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;

    await this.runtime.stop();

    process.exit(0);
  }
}
