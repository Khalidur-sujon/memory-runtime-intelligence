import { RuntimeContext } from '../context/RuntimeContext';

let runtimeContext: RuntimeContext | undefined;
let startingPromise: Promise<RuntimeContext> | undefined;

export async function startRuntime(): Promise<RuntimeContext> {
  if (runtimeContext) {
    return runtimeContext;
  }

  if (startingPromise) {
    return startingPromise;
  }

  startingPromise = (async () => {
    const context = new RuntimeContext();

    await context.start();

    runtimeContext = context;

    return context;
  })();

  try {
    return await startingPromise;
  } finally {
    startingPromise = undefined;
  }
}

export async function stopRuntime(): Promise<void> {
  const context = runtimeContext;

  if (!context) {
    return;
  }

  runtimeContext = undefined;

  await context.stop();
}
