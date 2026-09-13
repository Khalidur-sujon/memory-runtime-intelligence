export async function register() {
  const { register } = await import('memory-runtime-intelligence/next/runtime');

  register();
}
