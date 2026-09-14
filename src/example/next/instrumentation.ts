export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { register } = await import('memory-runtime-intelligence/next/runtime');

  register();
}
