import type { RuntimeContext } from '../../context/RuntimeContext';

export function runEventListenerLeakScenario(_runtime: RuntimeContext): void {
  console.log('Running Event Listener lifecycle scenarios...\n');

  const target = new EventTarget();

  // --------------------------------------------------
  // Scenario 1: Properly removed listener
  // Expected: NO FINDING
  // --------------------------------------------------

  console.log('Scenario 1: Properly removed listener');

  const clickHandler = () => {
    console.log('button clicked');
  };

  target.addEventListener('click', clickHandler);
  target.removeEventListener('click', clickHandler);

  // --------------------------------------------------
  // Scenario 2: Single unreleased listener
  // Expected: MEDIUM CONFIDENCE
  // --------------------------------------------------

  console.log('Scenario 2: Single unreleased listener');

  const scrollHandler = () => {
    console.log('scroll');
  };

  target.addEventListener('scroll', scrollHandler);

  // Intentionally NOT removed.

  // --------------------------------------------------
  // Scenario 3: Multiple independent unreleased listeners
  // Expected: Multiple MEDIUM findings
  // --------------------------------------------------

  console.log('Scenario 3: Multiple independent unreleased listeners');

  const resizeHandler = () => {
    console.log('resize');
  };

  const keydownHandler = () => {
    console.log('keydown');
  };

  const mouseMoveHandler = () => {
    console.log('mousemove');
  };

  target.addEventListener('resize', resizeHandler);
  target.addEventListener('keydown', keydownHandler);
  target.addEventListener('mousemove', mouseMoveHandler);

  // Intentionally NOT removed.

  // --------------------------------------------------
  // Scenario 4: Same handler, different event types
  // Expected: Only scroll registration remains
  // --------------------------------------------------

  console.log('Scenario 4: Same handler, different event types');

  const sharedHandler = () => {
    console.log('shared handler');
  };

  target.addEventListener('click', sharedHandler);
  target.addEventListener('scroll', sharedHandler);

  target.removeEventListener('click', sharedHandler);

  // scroll registration remains unreleased.

  // --------------------------------------------------
  // Scenario 5: Repeated add/remove lifecycle
  // Expected: NO FINDING
  // --------------------------------------------------

  console.log('Scenario 5: Repeated add/remove lifecycle');

  const visibilityHandler = () => {
    console.log('visibility changed');
  };

  target.addEventListener('visibilitychange', visibilityHandler);
  target.removeEventListener('visibilitychange', visibilityHandler);

  target.addEventListener('visibilitychange', visibilityHandler);
  target.removeEventListener('visibilitychange', visibilityHandler);

  target.addEventListener('visibilitychange', visibilityHandler);
  target.removeEventListener('visibilitychange', visibilityHandler);

  // --------------------------------------------------
  // Scenario 6: Different EventTargets
  // Expected: target A released, target B leaked
  // --------------------------------------------------

  console.log('Scenario 6: Multiple EventTargets');

  const targetA = new EventTarget();
  const targetB = new EventTarget();

  const handlerA = () => {
    console.log('target A');
  };

  const handlerB = () => {
    console.log('target B');
  };

  targetA.addEventListener('custom-event', handlerA);
  targetB.addEventListener('custom-event', handlerB);

  targetA.removeEventListener('custom-event', handlerA);

  // target B intentionally remains unreleased.

  // --------------------------------------------------
  // Scenario 7: Independent event lifecycles
  // Expected: input released, change leaked
  // --------------------------------------------------

  console.log('Scenario 7: Independent event lifecycles');

  const inputHandler = () => {
    console.log('input');
  };

  const changeHandler = () => {
    console.log('change');
  };

  target.addEventListener('input', inputHandler);
  target.addEventListener('change', changeHandler);

  target.removeEventListener('input', inputHandler);

  // changeHandler remains unreleased.

  // --------------------------------------------------
  // Scenario 8: Same logical listener created repeatedly
  // Expected: HIGH CONFIDENCE
  //
  // Simulates:
  //
  // UserListPage mount
  // UserListPage unmount
  // UserListPage mount
  // UserListPage unmount
  // UserListPage mount
  // UserListPage unmount
  //
  // Listener is created every time but never removed.
  // --------------------------------------------------

  console.log('Scenario 8: Repeated listener creation');

  const repeatedClickHandler1 = () => {
    console.log('UserListPage click #1');
  };

  const repeatedClickHandler2 = () => {
    console.log('UserListPage click #2');
  };

  const repeatedClickHandler3 = () => {
    console.log('UserListPage click #3');
  };

  const repeatedClickHandler4 = () => {
    console.log('UserListPage click #4');
  };

  target.addEventListener('click', repeatedClickHandler1);
  target.addEventListener('click', repeatedClickHandler2);
  target.addEventListener('click', repeatedClickHandler3);
  target.addEventListener('click', repeatedClickHandler4);

  // Intentionally NOT removed.
  //
  // Expected logical lifecycle:
  //
  // Created = 4
  // Released = 0
  // Unreleased = 4
  // Confidence = HIGH

  // --------------------------------------------------
  // Scenario 9: Repeated creation with partial cleanup
  // Expected: HIGH CONFIDENCE
  //
  // Created = 4
  // Released = 1
  // Unreleased = 3
  // --------------------------------------------------

  console.log('Scenario 9: Repeated creation with partial cleanup');

  const repeatedScrollHandler1 = () => {
    console.log('scroll #1');
  };

  const repeatedScrollHandler2 = () => {
    console.log('scroll #2');
  };

  const repeatedScrollHandler3 = () => {
    console.log('scroll #3');
  };

  const repeatedScrollHandler4 = () => {
    console.log('scroll #4');
  };

  target.addEventListener('scroll', repeatedScrollHandler1);
  target.addEventListener('scroll', repeatedScrollHandler2);
  target.addEventListener('scroll', repeatedScrollHandler3);
  target.addEventListener('scroll', repeatedScrollHandler4);

  // Only one instance is properly released.
  target.removeEventListener('scroll', repeatedScrollHandler1);

  // Expected:
  //
  // Created = 4
  // Released = 1
  // Unreleased = 3
  // Confidence = HIGH

  // --------------------------------------------------
  // Scenario 10: Repeated lifecycle with complete cleanup
  // Expected: NO FINDING
  // --------------------------------------------------

  console.log('Scenario 10: Repeated creation with complete cleanup');

  const cleanHandler1 = () => {
    console.log('clean #1');
  };

  const cleanHandler2 = () => {
    console.log('clean #2');
  };

  const cleanHandler3 = () => {
    console.log('clean #3');
  };

  target.addEventListener('keydown', cleanHandler1);
  target.removeEventListener('keydown', cleanHandler1);

  target.addEventListener('keydown', cleanHandler2);
  target.removeEventListener('keydown', cleanHandler2);

  target.addEventListener('keydown', cleanHandler3);
  target.removeEventListener('keydown', cleanHandler3);

  // Expected:
  //
  // Created = 3
  // Released = 3
  // Unreleased = 0
  // NO FINDING

  // --------------------------------------------------
  // Scenario 11: Repeated leak on another target
  // Expected: HIGH CONFIDENCE
  // --------------------------------------------------

  console.log('Scenario 11: Repeated leak on same target');

  const repeatedTarget = new EventTarget();

  const handlerA1 = () => {
    console.log('target repeated #1');
  };

  const handlerA2 = () => {
    console.log('target repeated #2');
  };

  const handlerA3 = () => {
    console.log('target repeated #3');
  };

  repeatedTarget.addEventListener('custom-event', handlerA1);
  repeatedTarget.addEventListener('custom-event', handlerA2);
  repeatedTarget.addEventListener('custom-event', handlerA3);

  // None are removed.
  //
  // Expected:
  //
  // Created = 3
  // Released = 0
  // Unreleased = 3
  // Confidence = HIGH

  // Prevent unused variable warnings.
  void scrollHandler;
  void resizeHandler;
  void keydownHandler;
  void mouseMoveHandler;
  void sharedHandler;
  void handlerB;
  void changeHandler;

  void repeatedClickHandler1;
  void repeatedClickHandler2;
  void repeatedClickHandler3;
  void repeatedClickHandler4;

  void repeatedScrollHandler1;
  void repeatedScrollHandler2;
  void repeatedScrollHandler3;
  void repeatedScrollHandler4;

  void cleanHandler1;
  void cleanHandler2;
  void cleanHandler3;

  void handlerA1;
  void handlerA2;
  void handlerA3;
}
