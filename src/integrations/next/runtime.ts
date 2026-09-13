import { RuntimeCollector } from '../../collector/RuntimeCollector';

export interface NextRuntimeOptions {
  port?: number;
}

let collector: RuntimeCollector | undefined;

let started = false;

export function register(options: NextRuntimeOptions = {}): void {
  if (started) {
    return;
  }

  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const port = options.port ?? 8787;
  const projectRoot = process.cwd();

  collector = new RuntimeCollector(port, projectRoot);

  collector.start();

  started = true;

  console.log(`[MRI] Runtime collector started on :${port}`);
}

export async function shutdown(): Promise<void> {
  if (!collector) {
    return;
  }

  const currentCollector = collector;

  collector = undefined;
  started = false;

  try {
    await currentCollector.stop();

    console.log('[MRI] Runtime collector stopped');
  } catch (error) {
    console.error('[MRI] Failed to stop runtime collector:', error);
  }
}
