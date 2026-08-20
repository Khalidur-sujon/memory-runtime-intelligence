import type { RuntimeContext } from '../../context/RuntimeContext';

export function runEventListenerLeakScenario(_runtime: RuntimeContext): void {
  const target = new EventTarget();

  // ==================================================
  // Scenario 1
  // Properly removed listener
  //
  // Expected:
  // Created    = 1
  // Released   = 1
  // Unreleased = 0
  // Finding    = NONE
  // ==================================================

  console.log('Scenario 1: Properly removed listener');

  const clickHandler = () => {
    console.log('button clicked');
  };

  target.addEventListener('click', clickHandler);

  target.removeEventListener('click', clickHandler);

  // ==================================================
  // Scenario 2
  // Single unreleased listener
  //
  // Expected:
  // Created    = 1
  // Released   = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 2: Single unreleased listener');

  const scrollHandler = () => {
    console.log('scroll');
  };

  target.addEventListener('scroll', scrollHandler);

  // Intentionally NOT removed.

  // ==================================================
  // Scenario 3
  // Multiple independent unreleased listeners
  //
  // Each listener is created from a DIFFERENT
  // physical source location.
  //
  // Expected:
  // Multiple groups
  //
  // Each group:
  // Created    = 1
  // Released   = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

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

  // ==================================================
  // Scenario 4
  // Same handler, different event types.
  //
  // This verifies that the same handler can represent
  // multiple independent registrations.
  //
  // Expected:
  //
  // click    -> released
  // scroll   -> unreleased
  //
  // The registration key must distinguish:
  //
  // click:false
  // scroll:false
  // ==================================================

  console.log('Scenario 4: Same handler, different event types');

  const sharedHandler = () => {
    console.log('shared handler');
  };

  target.addEventListener('click', sharedHandler);
  target.addEventListener('scroll', sharedHandler);

  target.removeEventListener('click', sharedHandler);

  // scroll registration intentionally remains active.

  // ==================================================
  // Scenario 5
  // Same source location, repeated creation +
  // complete cleanup.
  //
  // All addEventListener() calls happen from the SAME
  // physical source line inside cleanMountUnmount().
  //
  // Expected:
  //
  // Created    = 3
  // Released   = 3
  // Unreleased = 0
  // Finding    = NONE
  //
  // There MUST be only ONE resource group.
  // ==================================================

  console.log(
    'Scenario 5: Same location repeated creation with complete cleanup',
  );

  function cleanMountUnmount(): void {
    const handler = () => {
      console.log('clean lifecycle');
    };

    target.addEventListener('visibilitychange', handler);
    target.removeEventListener('visibilitychange', handler);
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
  // Every invocation creates a NEW handler, so the
  // browser creates a NEW listener registration.
  //
  // All registrations come from the SAME physical
  // addEventListener() source line.
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
    const handler = () => {
      console.log('leaking lifecycle');
    };

    target.addEventListener('click', handler);
  }

  leakingMount();
  leakingMount();
  leakingMount();
  leakingMount();
  leakingMount();

  // All five listeners intentionally remain active.

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
  // ONE GROUP.
  // ==================================================

  console.log(
    'Scenario 7: Same location repeated creation with partial cleanup',
  );

  const partialHandlers: EventListener[] = [];

  function partialMount(): EventListener {
    const handler = () => {
      console.log('partial lifecycle');
    };

    target.addEventListener('change', handler);

    return handler;
  }

  const partial1 = partialMount();
  partialHandlers.push(partial1);

  const partial2 = partialMount();
  partialHandlers.push(partial2);

  const partial3 = partialMount();
  partialHandlers.push(partial3);

  const partial4 = partialMount();
  partialHandlers.push(partial4);

  const partial5 = partialMount();
  partialHandlers.push(partial5);

  // Cleanup only the first two instances.
  target.removeEventListener('change', partialHandlers[0]);
  target.removeEventListener('change', partialHandlers[1]);

  // partial3, partial4, partial5 intentionally remain active.

  // ==================================================
  // Scenario 8
  // Same source location, repeated creation with
  // the same event type.
  //
  // This verifies that event type does NOT create a
  // different group when the source location is same.
  //
  // Expected:
  //
  // Created    = 10
  // Released   = 0
  // Unreleased = 10
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 8: Same location and same event type');

  function repeatedSameEventType(): void {
    const handler = () => {
      console.log('repeated click');
    };

    target.addEventListener('click', handler);
  }

  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();
  repeatedSameEventType();

  // All ten listeners intentionally remain active.

  // ==================================================
  // Scenario 9
  // Same source location, different event types.
  //
  // The function contains ONE addEventListener()
  // source line.
  //
  // Event type changes between invocations.
  //
  // IMPORTANT:
  // Current grouping identity is:
  //
  // event-listener + sourceLocation
  //
  // Therefore all five registrations should belong
  // to ONE resource group.
  //
  // Expected:
  //
  // Created    = 5
  // Released   = 0
  // Unreleased = 5
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 9: Same location with different event types');

  function repeatedDifferentEventType(type: string): void {
    const handler = () => {
      console.log(`event: ${type}`);
    };

    target.addEventListener(type, handler);
  }

  repeatedDifferentEventType('click');
  repeatedDifferentEventType('scroll');
  repeatedDifferentEventType('keydown');
  repeatedDifferentEventType('change');
  repeatedDifferentEventType('input');

  // All five listeners intentionally remain active.

  // ==================================================
  // Scenario 10
  // Realistic component/page lifecycle simulation.
  //
  // mount -> listener
  // unmount -> remove listener
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

  function mountComponent(): EventListener {
    const handler = () => {
      console.log('component event');
    };

    target.addEventListener('custom-event', handler);

    return handler;
  }

  // Mount #1 -> Unmount #1
  const componentHandler1 = mountComponent();
  target.removeEventListener('custom-event', componentHandler1);

  // Mount #2 -> Unmount #2
  const componentHandler2 = mountComponent();
  target.removeEventListener('custom-event', componentHandler2);

  // Mount #3 -> Unmount #3
  const componentHandler3 = mountComponent();
  target.removeEventListener('custom-event', componentHandler3);

  // Mount #4 -> Leak
  mountComponent();

  // Mount #5 -> Leak
  mountComponent();

  // Mount #6 -> Leak
  mountComponent();

  // Mount #7 -> Leak
  mountComponent();

  // ==================================================
  // Scenario 11
  // Same source location, repeated creation on
  // another EventTarget.
  //
  // IMPORTANT:
  // Resource grouping is based on source location,
  // not EventTarget identity.
  //
  // All registrations are created from the SAME
  // addEventListener() source line.
  //
  // Expected:
  //
  // Created    = 3
  // Released   = 0
  // Unreleased = 3
  //
  // ONE GROUP under the current grouping strategy.
  // ==================================================

  console.log('Scenario 11: Same location repeated creation on another target');

  const repeatedTarget = new EventTarget();

  function repeatedTargetMount(): void {
    const handler = () => {
      console.log('repeated target lifecycle');
    };

    repeatedTarget.addEventListener('custom-event', handler);
  }

  repeatedTargetMount();
  repeatedTargetMount();
  repeatedTargetMount();

  // All three listeners intentionally remain active.
}
