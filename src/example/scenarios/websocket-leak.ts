import type { RuntimeContext } from '../../context/RuntimeContext';

export function runWebSocketLeakScenario(_runtime: RuntimeContext): void {
  console.log('Running WebSocket lifecycle scenario...\n');

  // WebSocket 1 (Properly closed)
  const ws1 = new WebSocket('ws://example.com/1');
  ws1.close();

  // WebSocket 2 (Single leaked instance -> MEDIUM confidence)
  const ws2 = new WebSocket('ws://example.com/2');

  // WebSocket 3 & 4 (Repeated leak -> HIGH confidence)
  const ws3 = new WebSocket('ws://example.com/3');
  const ws4 = new WebSocket('ws://example.com/4');

  // Prevent unused variable warnings
  void ws2;
  void ws3;
  void ws4;
}
