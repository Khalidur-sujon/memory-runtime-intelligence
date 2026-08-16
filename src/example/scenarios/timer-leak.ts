import type { RuntimeContext } from '../../context/RuntimeContext';

export function runTimerLeakScenario(_runtime: RuntimeContext): void {
  console.log('Scenario 1: Properly cleared interval');

  const interval1 = setInterval(() => {}, 1000);

  clearInterval(interval1);

  // --------------------------------------------------
  // Scenario 2: Single unreleased interval
  // Expected: MEDIUM CONFIDENCE
  // --------------------------------------------------

  console.log('Scenario 2: Single unreleased interval');

  const interval2 = setInterval(() => {}, 2000);

  // Intentionally NOT cleared.

  // --------------------------------------------------
  // Scenario 3: Multiple independent unreleased intervals
  // Expected: Multiple MEDIUM findings
  // --------------------------------------------------

  console.log('Scenario 3: Multiple independent unreleased intervals');

  const interval3 = setInterval(() => {}, 3000);

  const interval4 = setInterval(() => {}, 5000);

  const interval5 = setInterval(() => {}, 10000);

  // Intentionally NOT cleared.

  // --------------------------------------------------
  // Scenario 4: Same delay, independent intervals
  // Expected: Multiple unreleased intervals
  // --------------------------------------------------

  console.log('Scenario 4: Same delay, independent intervals');

  const interval6 = setInterval(() => {}, 1000);

  const interval7 = setInterval(() => {}, 1000);

  const interval8 = setInterval(() => {}, 1000);

  // Intentionally NOT cleared.

  // --------------------------------------------------
  // Scenario 5: Repeated creation with complete cleanup
  // Expected: NO FINDING
  // --------------------------------------------------

  console.log('Scenario 5: Repeated creation with complete cleanup');

  const cleanInterval1 = setInterval(() => {}, 1000);

  clearInterval(cleanInterval1);

  const cleanInterval2 = setInterval(() => {}, 2000);

  clearInterval(cleanInterval2);

  const cleanInterval3 = setInterval(() => {}, 3000);

  clearInterval(cleanInterval3);

  // --------------------------------------------------
  // Scenario 6: Repeated creation with partial cleanup
  // Expected: HIGH CONFIDENCE
  //
  // Created = 4
  // Released = 1
  // Unreleased = 3
  // --------------------------------------------------

  console.log('Scenario 6: Repeated creation with partial cleanup');

  const partialInterval1 = setInterval(() => {}, 1000);

  const partialInterval2 = setInterval(() => {}, 2000);

  const partialInterval3 = setInterval(() => {}, 3000);

  const partialInterval4 = setInterval(() => {}, 4000);

  // Only one instance is properly released.
  clearInterval(partialInterval1);

  // Expected:
  //
  // Created = 4
  // Released = 1
  // Unreleased = 3
  // Confidence = HIGH

  // --------------------------------------------------
  // Scenario 7: Multiple intervals with different delays
  // Expected: HIGH CONFIDENCE
  // --------------------------------------------------

  console.log('Scenario 7: Multiple intervals with different delays');

  const fastInterval = setInterval(() => {}, 500);

  const mediumInterval = setInterval(() => {}, 5000);

  const slowInterval = setInterval(() => {}, 30000);

  // Intentionally NOT cleared.

  // --------------------------------------------------
  // Scenario 8: Repeated interval creation
  // Expected: HIGH CONFIDENCE
  //
  // Simulates repeated component/page mounting
  //
  // Created = 4
  // Released = 0
  // Unreleased = 4
  // --------------------------------------------------

  console.log('Scenario 8: Repeated interval creation');

  const repeatedInterval1 = setInterval(() => {}, 2000);

  const repeatedInterval2 = setInterval(() => {}, 2000);

  const repeatedInterval3 = setInterval(() => {}, 2000);

  const repeatedInterval4 = setInterval(() => {}, 2000);

  // Intentionally NOT cleared.
  //
  // Expected:
  //
  // Created = 4
  // Released = 0
  // Unreleased = 4
  // Confidence = HIGH

  // --------------------------------------------------
  // Scenario 9: Repeated creation with partial cleanup
  // Expected: HIGH CONFIDENCE
  //
  // Created = 5
  // Released = 2
  // Unreleased = 3
  // --------------------------------------------------

  void interval2;
  void interval3;
  void interval4;
  void interval5;

  void interval6;
  void interval7;
  void interval8;

  void fastInterval;
  void mediumInterval;
  void slowInterval;

  void repeatedInterval1;
  void repeatedInterval2;
  void repeatedInterval3;
  void repeatedInterval4;

  void partialInterval2;
  void partialInterval3;
  void partialInterval4;
}
