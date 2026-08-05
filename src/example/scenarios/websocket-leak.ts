import type { RuntimeContext } from '../../context/RuntimeContext';

export function runWebSocketLeakScenario(_runtime: RuntimeContext): void {
  console.log('Running WebSocket lifecycle scenario...\n');

  // WebSocket 1 (Properly closed)
  const ws1 = new WebSocket('ws://example.com/1');

  ws1.close();

  // WebSocket 2 (Intentionally leaked)
  const ws2 = new WebSocket('ws://example.com/2');

  // Prevent unused variable warning
  void ws2;
}
