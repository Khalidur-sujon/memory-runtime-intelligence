import type { RuntimeContext } from '../../context/RuntimeContext';

export function runTimerLeakScenario(_runtime: RuntimeContext): void {
  // ==================================================
  // Scenario 1
  // Properly cleared interval
  //
  // Expected:
  // Created   = 1
  // Released  = 1
  // Unreleased = 0
  // Finding   = NONE
  // ==================================================

  console.log('Scenario 1: Properly cleared interval');

  const interval1 = setInterval(() => {}, 1000);

  clearInterval(interval1);

  // ==================================================
  // Scenario 2
  // Single unreleased interval
  //
  // Expected:
  // Created   = 1
  // Released  = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 2: Single unreleased interval');

  const interval2 = setInterval(() => {}, 2000);

  // Intentionally NOT cleared.

  // ==================================================
  // Scenario 3
  // Multiple independent unreleased intervals
  //
  // Each call has a DIFFERENT source location.
  //
  // Expected:
  // Multiple groups
  // Each group:
  // Created   = 1
  // Released  = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 3: Multiple independent unreleased intervals');

  const interval3 = setInterval(() => {}, 3000);
  const interval4 = setInterval(() => {}, 5000);
  const interval5 = setInterval(() => {}, 10000);

  // Intentionally NOT cleared.

  // ==================================================
  // Scenario 4
  // Same delay, independent intervals
  //
  // These are intentionally written on different lines.
  //
  // Expected:
  // Multiple groups because source locations differ.
  //
  // Delay MUST NOT be used as the grouping identity.
  // ==================================================

  console.log('Scenario 4: Same delay, independent intervals');

  const interval6 = setInterval(() => {}, 1000);
  const interval7 = setInterval(() => {}, 1000);
  const interval8 = setInterval(() => {}, 1000);

  // Intentionally NOT cleared.

  // ==================================================
  // Scenario 5
  // Same source location, repeated creation + cleanup
  //
  // This simulates:
  //
  // mount
  //   -> create interval
  // unmount
  //   -> cleanup
  //
  // repeated multiple times.
  //
  // IMPORTANT:
  // All setInterval() calls happen from the SAME
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
    const interval = setInterval(() => {}, 1500);
    clearInterval(interval);
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
  // setInterval() source location.
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
  // ├── created   = 5
  // ├── released  = 0
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
    setInterval(() => {}, 2000);
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

  const partialIntervals: ReturnType<typeof setInterval>[] = [];

  function partialMount(): ReturnType<typeof setInterval> {
    return setInterval(() => {}, 3000);
  }

  const partial1 = partialMount();
  partialIntervals.push(partial1);

  const partial2 = partialMount();
  partialIntervals.push(partial2);

  const partial3 = partialMount();
  partialIntervals.push(partial3);

  const partial4 = partialMount();
  partialIntervals.push(partial4);

  const partial5 = partialMount();
  partialIntervals.push(partial5);

  // Cleanup only the first two instances.
  clearInterval(partialIntervals[0]);
  clearInterval(partialIntervals[1]);

  // partial3, partial4, partial5 intentionally remain active.

  // ==================================================
  // Scenario 8
  // Same source location, repeated creation with
  // same delay.
  //
  // This specifically verifies that the grouping key
  // is NOT based on the timer delay.
  //
  // Expected:
  //
  // Created    = 10
  // Released   = 0
  // Unreleased = 10
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 8: Same location and same delay');

  function repeatedSameDelay(): void {
    setInterval(() => {}, 1000);
  }

  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();
  repeatedSameDelay();

  // ==================================================
  // Scenario 9
  // Same source location, repeated creation with
  // different delays.
  //
  // This verifies that delay does NOT split the group
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
  // The function contains ONE setInterval source line.
  // The delay changes between invocations.
  // ==================================================

  console.log('Scenario 9: Same location with different delays');

  function repeatedDifferentDelay(delay: number): void {
    setInterval(() => {}, delay);
  }

  repeatedDifferentDelay(500);
  repeatedDifferentDelay(1000);
  repeatedDifferentDelay(5000);
  repeatedDifferentDelay(10000);
  repeatedDifferentDelay(30000);

  // ==================================================
  // Scenario 10
  // Realistic component/page lifecycle simulation.
  //
  // mount -> interval
  // unmount -> cleanup
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

  function mountComponent(): ReturnType<typeof setInterval> {
    return setInterval(() => {}, 4000);
  }

  // Mount #1 -> Unmount #1
  const componentInterval1 = mountComponent();
  clearInterval(componentInterval1);

  // Mount #2 -> Unmount #2
  const componentInterval2 = mountComponent();
  clearInterval(componentInterval2);

  // Mount #3 -> Unmount #3
  const componentInterval3 = mountComponent();
  clearInterval(componentInterval3);

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

  void interval2;
  void interval3;
  void interval4;
  void interval5;
  void interval6;
  void interval7;
  void interval8;
}
