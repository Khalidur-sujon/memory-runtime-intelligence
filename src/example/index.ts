import { RuntimeContext } from '../context/RuntimeContext';

import { runWebSocketLeakScenario } from './scenarios/websocket-leak';

import { Analyzer } from '../analysis/Analyzer';

import type { AnalysisContext } from '../analysis/AnalysisContext';
import { ResourceLifecycleRule } from '../analysis/rules/ResourceLifecycleRule';
import { ConsoleRenderer, Presentation } from '../presentation';
import { runEventListenerLeakScenario } from './scenarios/event-listener-leak';
import { runTimerLeakScenario } from './scenarios/timer-leak';
import { runObserverLeakScenario } from './scenarios/observer-leak';
import { RuntimeSession } from '../runtime/RuntimeSession';
import { RuntimeStorage } from '../runtime/RuntimeStorage';
import { SnapshotScheduler } from '../runtime/SnapshotScheduler';
import { RuntimeStaleDetector } from '../runtime/RuntimeStaleDetector';
import { RuntimeStateChecker } from '../runtime/RuntimeStateChecker';
import { startRuntime } from '../bootstrap/startRuntime';

const runtime = await startRuntime();

// runWebSocketLeakScenario(runtime);
// runEventListenerLeakScenario(runtime);
// runTimerLeakScenario(runtime);
// runObserverLeakScenario(runtime);

await new Promise((resolve) => setTimeout(resolve, 1500));

// ----------------- test----------
const storage = new RuntimeStorage();

const staleDetector = new RuntimeStaleDetector();

const checker = new RuntimeStateChecker(storage, staleDetector);

console.log('Runtime stale:', await checker.isStale());
// ---------------------------

const registry = runtime.getRegistry();

const analyzer = new Analyzer([new ResourceLifecycleRule()]);

const analysisContext: AnalysisContext = {
  resources: registry.list(),
  history: runtime.getHistory(),
};

const findings = analyzer.analyze(analysisContext);

const presentation = new Presentation(new ConsoleRenderer());

console.log('\nAnalysis Report\n');

console.log(presentation.present(findings));

// await runtime.stop();

console.log('Runtime stopped');
