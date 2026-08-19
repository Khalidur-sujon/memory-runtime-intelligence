import type { RuntimeContext } from '../../context/RuntimeContext';

export function runWebSocketLeakScenario(_runtime: RuntimeContext): void {
  // ==================================================
  // Scenario 1
  // Properly closed WebSocket
  //
  // Expected:
  // Created   = 1
  // Released  = 1
  // Unreleased = 0
  // Finding   = NONE
  // ==================================================

  console.log('Scenario 1: Properly closed WebSocket');

  const ws1 = new WebSocket('ws://example.com/1');

  ws1.close();

  // ==================================================
  // Scenario 2
  // Single unreleased WebSocket
  //
  // Expected:
  // Created   = 1
  // Released  = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 2: Single unreleased WebSocket');

  const ws2 = new WebSocket('ws://example.com/2');

  // Intentionally NOT closed.

  // ==================================================
  // Scenario 3
  // Multiple independent unreleased WebSockets
  //
  // Each WebSocket is created from a DIFFERENT
  // physical source location.
  //
  // Expected:
  // Multiple groups
  //
  // Each group:
  // Created   = 1
  // Released  = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 3: Multiple independent unreleased WebSockets');

  const ws3 = new WebSocket('ws://example.com/3');
  const ws4 = new WebSocket('ws://example.com/4');
  const ws5 = new WebSocket('ws://example.com/5');

  // Intentionally NOT closed.

  // ==================================================
  // Scenario 4
  // Same URL, independent WebSockets
  //
  // These are intentionally written on different lines.
  //
  // Expected:
  // Multiple groups because source locations differ.
  //
  // URL MUST NOT be used as the grouping identity.
  // ==================================================

  console.log('Scenario 4: Same URL, independent WebSockets');

  const ws6 = new WebSocket('ws://example.com/same');
  const ws7 = new WebSocket('ws://example.com/same');
  const ws8 = new WebSocket('ws://example.com/same');

  // Intentionally NOT closed.

  // ==================================================
  // Scenario 5
  // Same source location, repeated creation + cleanup
  //
  // Simulates:
  //
  // mount
  //   -> create WebSocket
  // unmount
  //   -> close WebSocket
  //
  // repeated multiple times.
  //
  // IMPORTANT:
  // All new WebSocket() calls happen from the SAME
  // physical source line inside cleanMountUnmount().
  //
  // Expected:
  //
  // Created    = 3
  // Released   = 3
  // Unreleased = 0
  // Finding    = NONE
  //
  // There MUST be only ONE group.
  // ==================================================

  console.log(
    'Scenario 5: Same location repeated creation with complete cleanup',
  );

  function cleanMountUnmount(): void {
    const ws = new WebSocket('ws://example.com/clean');
    ws.close();
  }

  cleanMountUnmount();
  cleanMountUnmount();
  cleanMountUnmount();

  // ==================================================
  // Scenario 6
  // Same source location, repeated creation,
  // NO cleanup.
  //
  // This is the most important grouping test.
  //
  // All resources are created from the SAME
  // new WebSocket() source location.
  //
  // Expected:
  //
  // Created    = 5
  // Released   = 0
  // Unreleased = 5
  // Confidence = HIGH
  //
  // Expected grouping:
  //
  // ONE GROUP
  // ├── created    = 5
  // ├── released   = 0
  // └── unreleased = 5
  //
  // NOT:
  //
  // GROUP 1 -> created = 1
  // GROUP 2 -> created = 1
  // GROUP 3 -> created = 1
  // GROUP 4 -> created = 1
  // GROUP 5 -> created = 1
  // ==================================================

  console.log('Scenario 6: Same location repeated creation without cleanup');

  function leakingMount(): void {
    new WebSocket('ws://example.com/leak');
  }

  leakingMount();
  leakingMount();
  leakingMount();
  leakingMount();
  leakingMount();

  // ==================================================
  // Scenario 7
  // Same source location, partial cleanup.
  //
  // Simulates:
  //
  // mount #1 -> create -> cleanup
  // mount #2 -> create -> cleanup
  // mount #3 -> create -> LEAK
  // mount #4 -> create -> LEAK
  // mount #5 -> create -> LEAK
  //
  // Expected:
  //
  // Created    = 5
  // Released   = 2
  // Unreleased = 3
  // Confidence = HIGH
  //
  // Expected grouping:
  //
  // ONE GROUP
  // ├── created    = 5
  // ├── released   = 2
  // └── unreleased = 3
  // ==================================================

  console.log(
    'Scenario 7: Same location repeated creation with partial cleanup',
  );

  const partialSockets: WebSocket[] = [];

  function partialMount(): WebSocket {
    return new WebSocket('ws://example.com/partial');
  }

  const partial1 = partialMount();
  partialSockets.push(partial1);

  const partial2 = partialMount();
  partialSockets.push(partial2);

  const partial3 = partialMount();
  partialSockets.push(partial3);

  const partial4 = partialMount();
  partialSockets.push(partial4);

  const partial5 = partialMount();
  partialSockets.push(partial5);

  // Cleanup only the first two instances.
  partialSockets[0].close();
  partialSockets[1].close();

  // partial3, partial4, partial5 intentionally remain open.

  // ==================================================
  // Scenario 8
  // Same source location, repeated creation with
  // the same URL.
  //
  // This specifically verifies that URL does NOT
  // create separate groups.
  //
  // Expected:
  //
  // Created    = 10
  // Released   = 0
  // Unreleased = 10
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 8: Same location and same URL');

  function repeatedSameUrl(): void {
    new WebSocket('ws://example.com/repeated');
  }

  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();
  repeatedSameUrl();

  // ==================================================
  // Scenario 9
  // Same source location, repeated creation with
  // different URLs.
  //
  // This verifies that URL does NOT split the group
  // when the source location is the same.
  //
  // Expected:
  //
  // Created    = 5
  // Released   = 0
  // Unreleased = 5
  //
  // ONE GROUP if source location is the identity.
  //
  // NOTE:
  // The function contains ONE new WebSocket()
  // source line.
  // The URL changes between invocations.
  // ==================================================

  console.log('Scenario 9: Same location with different URLs');

  function repeatedDifferentUrl(url: string): void {
    new WebSocket(url);
  }

  repeatedDifferentUrl('ws://example.com/500');
  repeatedDifferentUrl('ws://example.com/1000');
  repeatedDifferentUrl('ws://example.com/5000');
  repeatedDifferentUrl('ws://example.com/10000');
  repeatedDifferentUrl('ws://example.com/30000');

  // ==================================================
  // Scenario 10
  // Realistic component/page lifecycle simulation.
  //
  // mount -> WebSocket
  // unmount -> close
  //
  // repeated many times from the SAME source line.
  //
  // First 3 mounts are clean.
  // Last 4 mounts leak.
  //
  // Expected:
  //
  // Created    = 7
  // Released   = 3
  // Unreleased = 4
  // Confidence = HIGH
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 10: Realistic mount/unmount lifecycle');

  function mountComponent(): WebSocket {
    return new WebSocket('ws://example.com/component');
  }

  // Mount #1 -> Unmount #1
  const componentSocket1 = mountComponent();
  componentSocket1.close();

  // Mount #2 -> Unmount #2
  const componentSocket2 = mountComponent();
  componentSocket2.close();

  // Mount #3 -> Unmount #3
  const componentSocket3 = mountComponent();
  componentSocket3.close();

  // Mount #4 -> Leak
  mountComponent();

  // Mount #5 -> Leak
  mountComponent();

  // Mount #6 -> Leak
  mountComponent();

  // Mount #7 -> Leak
  mountComponent();

  // ==================================================
  // Prevent unused-variable issues for intentionally
  // leaked scenario variables.
  // ==================================================

  void ws2;
  void ws3;
  void ws4;
  void ws5;
  void ws6;
  void ws7;
  void ws8;
}
