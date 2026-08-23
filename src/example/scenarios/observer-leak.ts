import type { RuntimeContext } from '../../context/RuntimeContext';
import { JSDOM } from 'jsdom';

/**
 * ==================================================
 * Node.js DOM environment
 * ==================================================
 *
 * Node.js does not provide browser Observer APIs
 * by default.
 *
 * jsdom provides MutationObserver, but it does not
 * provide ResizeObserver and IntersectionObserver.
 *
 * So we provide small runtime-compatible fallbacks
 * for the example environment.
 */

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body></body>
  </html>
`);

const { document } = dom.window;

/**
 * Use jsdom's MutationObserver.
 */
if (!globalThis.MutationObserver) {
  globalThis.MutationObserver = dom.window.MutationObserver;
}

/**
 * Minimal ResizeObserver implementation.
 *
 * The instrumentation only needs:
 *
 * - constructor
 * - observe()
 * - disconnect()
 *
 * We do not need real browser resize behavior
 * for a lifecycle/leak instrumentation test.
 */
if (!globalThis.ResizeObserver) {
  class NodeResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}

    observe(_target: Element, _options?: ResizeObserverOptions): void {}

    unobserve(_target: Element): void {}

    disconnect(): void {}
  }

  globalThis.ResizeObserver =
    NodeResizeObserver as unknown as typeof ResizeObserver;
}

/**
 * Minimal IntersectionObserver implementation.
 *
 * Again, we only need the lifecycle API for this
 * instrumentation scenario.
 */
if (!globalThis.IntersectionObserver) {
  class NodeIntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds: readonly number[] = [0];

    constructor(
      _callback: IntersectionObserverCallback,
      _options?: IntersectionObserverInit,
    ) {}

    observe(_target: Element): void {}

    unobserve(_target: Element): void {}

    disconnect(): void {}

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    NodeIntersectionObserver as unknown as typeof IntersectionObserver;
}

/**
 * ==================================================
 * Scenario
 * ==================================================
 */

export function runObserverLeakScenario(_runtime: RuntimeContext): void {
  // ==================================================
  // Shared targets
  //
  // Observer APIs require DOM Nodes/Elements,
  // not generic EventTarget instances.
  // ==================================================

  const mutationTarget = document.createElement('div');

  const resizeTarget = document.createElement('div');

  const intersectionTarget = document.createElement('div');

  // ==================================================
  // Scenario 1
  // Properly disconnected MutationObserver
  //
  // Expected:
  //
  // Created    = 1
  // Started    = 1
  // Released   = 1
  // Unreleased = 0
  // Finding    = NONE
  // ==================================================

  console.log('Scenario 1: Properly disconnected MutationObserver');

  const mutationObserver = new MutationObserver(() => {
    console.log('mutation detected');
  });

  mutationObserver.observe(mutationTarget, {
    attributes: true,
  });

  mutationObserver.disconnect();

  // ==================================================
  // Scenario 2
  // Single unreleased MutationObserver
  //
  // Expected:
  //
  // Created    = 1
  // Started    = 1
  // Released   = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 2: Single unreleased MutationObserver');

  const leakingMutationObserver = new MutationObserver(() => {
    console.log('leaking mutation observer');
  });

  leakingMutationObserver.observe(mutationTarget, {
    childList: true,
  });

  // Intentionally NOT disconnected.

  // ==================================================
  // Scenario 3
  // Single unreleased ResizeObserver
  //
  // Expected:
  //
  // Created    = 1
  // Started    = 1
  // Released   = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 3: Single unreleased ResizeObserver');

  const resizeObserver = new ResizeObserver(() => {
    console.log('resize detected');
  });

  resizeObserver.observe(resizeTarget);

  // Intentionally NOT disconnected.

  // ==================================================
  // Scenario 4
  // Single unreleased IntersectionObserver
  //
  // Expected:
  //
  // Created    = 1
  // Started    = 1
  // Released   = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 4: Single unreleased IntersectionObserver');

  const intersectionObserver = new IntersectionObserver(() => {
    console.log('intersection detected');
  });

  intersectionObserver.observe(intersectionTarget);

  // Intentionally NOT disconnected.

  // ==================================================
  // Scenario 5
  // Multiple independent unreleased observers
  //
  // Different physical source locations.
  //
  // Expected:
  //
  // Multiple resource groups.
  //
  // Each group:
  // Created    = 1
  // Released   = 0
  // Unreleased = 1
  // Confidence = MEDIUM
  // ==================================================

  console.log('Scenario 5: Multiple independent unreleased observers');

  const observerTarget = document.createElement('div');

  const mutationObserver2 = new MutationObserver(() => {
    console.log('mutation 2');
  });

  mutationObserver2.observe(observerTarget, {
    childList: true,
  });

  const resizeObserver2 = new ResizeObserver(() => {
    console.log('resize 2');
  });

  resizeObserver2.observe(observerTarget);

  const intersectionObserver2 = new IntersectionObserver(() => {
    console.log('intersection 2');
  });

  intersectionObserver2.observe(observerTarget);

  // All three intentionally remain active.

  // ==================================================
  // Scenario 6
  // Same source location, repeated observer creation
  // with complete cleanup.
  //
  // Expected:
  //
  // Created    = 3
  // Started    = 3
  // Released   = 3
  // Unreleased = 0
  // Finding    = NONE
  //
  // ONE resource group.
  // ==================================================

  console.log(
    'Scenario 6: Same location repeated creation with complete cleanup',
  );

  function cleanMountUnmount(): void {
    const observer = new MutationObserver(() => {
      console.log('clean observer lifecycle');
    });

    observer.observe(observerTarget, {
      childList: true,
    });

    observer.disconnect();
  }

  cleanMountUnmount();
  cleanMountUnmount();
  cleanMountUnmount();

  // ==================================================
  // Scenario 7
  // Same source location, repeated creation,
  // NO cleanup.
  //
  // Expected:
  //
  // ONE GROUP
  //
  // Created    = 5
  // Started    = 5
  // Released   = 0
  // Unreleased = 5
  // Confidence = HIGH
  // ==================================================

  console.log('Scenario 7: Same location repeated creation without cleanup');

  function leakingMount(): void {
    const observer = new MutationObserver(() => {
      console.log('leaking observer lifecycle');
    });

    observer.observe(observerTarget, {
      childList: true,
    });
  }

  leakingMount();
  leakingMount();
  leakingMount();
  leakingMount();
  leakingMount();

  // All five observers intentionally remain active.

  // ==================================================
  // Scenario 8
  // Same source location, partial cleanup.
  //
  // Expected:
  //
  // Created    = 5
  // Started    = 5
  // Released   = 2
  // Unreleased = 3
  // Confidence = HIGH
  //
  // ONE GROUP.
  // ==================================================

  console.log(
    'Scenario 8: Same location repeated creation with partial cleanup',
  );

  const partialObservers: MutationObserver[] = [];

  function partialMount(): MutationObserver {
    const observer = new MutationObserver(() => {
      console.log('partial observer lifecycle');
    });

    observer.observe(observerTarget, {
      childList: true,
    });

    return observer;
  }

  const partial1 = partialMount();
  partialObservers.push(partial1);

  const partial2 = partialMount();
  partialObservers.push(partial2);

  const partial3 = partialMount();
  partialObservers.push(partial3);

  const partial4 = partialMount();
  partialObservers.push(partial4);

  const partial5 = partialMount();
  partialObservers.push(partial5);

  // Cleanup only the first two instances.
  partialObservers[0].disconnect();
  partialObservers[1].disconnect();

  // partial3, partial4, partial5 intentionally remain active.

  // ==================================================
  // Scenario 9
  // Same source location, different Observer types.
  //
  // Current grouping:
  //
  // observer type + sourceLocation
  //
  // Therefore the three observer types should have
  // three different resource groups.
  //
  // Expected:
  //
  // mutation:
  //   Created    = 1
  //   Started    = 1
  //   Released   = 0
  //
  // resize:
  //   Created    = 1
  //   Started    = 1
  //   Released   = 0
  //
  // intersection:
  //   Created    = 1
  //   Started    = 1
  //   Released   = 0
  // ==================================================

  console.log('Scenario 9: Same location with different observer types');

  function createDifferentObserver(
    type: 'mutation' | 'resize' | 'intersection',
  ): void {
    if (type === 'mutation') {
      const observer = new MutationObserver(() => {
        console.log('dynamic mutation');
      });

      observer.observe(observerTarget, {
        childList: true,
      });

      return;
    }

    if (type === 'resize') {
      const observer = new ResizeObserver(() => {
        console.log('dynamic resize');
      });

      observer.observe(observerTarget);

      return;
    }

    const observer = new IntersectionObserver(() => {
      console.log('dynamic intersection');
    });

    observer.observe(observerTarget);
  }

  createDifferentObserver('mutation');
  createDifferentObserver('resize');
  createDifferentObserver('intersection');

  // All three intentionally remain active.

  // ==================================================
  // Scenario 10
  // Same Observer instance observes multiple targets.
  //
  // Expected under CURRENT lifecycle model:
  //
  // Created    = 1
  // Started    = 2
  // Released   = 1
  // Unreleased = 0
  //
  // IMPORTANT:
  //
  // Started is NOT counted as Created.
  //
  // disconnect() releases the whole Observer instance.
  // ==================================================

  console.log('Scenario 10: One observer observing multiple targets');

  const targetA = document.createElement('div');

  const targetB = document.createElement('div');

  const multiTargetObserver = new MutationObserver(() => {
    console.log('multiple targets');
  });

  multiTargetObserver.observe(targetA, {
    childList: true,
  });

  multiTargetObserver.observe(targetB, {
    childList: true,
  });

  multiTargetObserver.disconnect();

  // ==================================================
  // Scenario 11
  // Realistic component lifecycle simulation.
  //
  // mount -> create observer -> observe
  // unmount -> disconnect
  //
  // First 3 mounts are clean.
  // Last 4 mounts leak.
  //
  // Expected:
  //
  // Created    = 7
  // Started    = 7
  // Released   = 3
  // Unreleased = 4
  // Confidence = HIGH
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 11: Realistic mount/unmount lifecycle');

  function mountComponent(): MutationObserver {
    const observer = new MutationObserver(() => {
      console.log('component mutation');
    });

    observer.observe(observerTarget, {
      childList: true,
    });

    return observer;
  }

  // Mount #1 -> Unmount #1
  const componentObserver1 = mountComponent();
  componentObserver1.disconnect();

  // Mount #2 -> Unmount #2
  const componentObserver2 = mountComponent();
  componentObserver2.disconnect();

  // Mount #3 -> Unmount #3
  const componentObserver3 = mountComponent();
  componentObserver3.disconnect();

  // Mount #4 -> Leak
  mountComponent();

  // Mount #5 -> Leak
  mountComponent();

  // Mount #6 -> Leak
  mountComponent();

  // Mount #7 -> Leak
  mountComponent();

  // ==================================================
  // Scenario 12
  // Same source location, repeated creation on
  // another target.
  //
  // Grouping is based on:
  //
  // observer type + sourceLocation
  //
  // NOT target identity.
  //
  // Expected:
  //
  // Created    = 3
  // Started    = 3
  // Released   = 0
  // Unreleased = 3
  //
  // ONE GROUP.
  // ==================================================

  console.log('Scenario 12: Same location repeated creation on another target');

  const anotherTarget = document.createElement('div');

  function anotherTargetMount(): void {
    const observer = new ResizeObserver(() => {
      console.log('another target resize');
    });

    observer.observe(anotherTarget);
  }

  anotherTargetMount();
  anotherTargetMount();
  anotherTargetMount();

  // All three observers intentionally remain active.
}
