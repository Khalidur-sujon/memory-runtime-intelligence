import { RuntimeContext } from '../context/RuntimeContext';

import { runWebSocketLeakScenario } from './scenarios/websocket-leak';

import { Analyzer } from '../analysis/Analyzer';

import type { AnalysisContext } from '../analysis/AnalysisContext';
import { ResourceLifecycleRule } from '../analysis/rules/ResourceLifecycleRule';
import { ConsoleRenderer, Presentation } from '../presentation';
import { runEventListenerLeakScenario } from './scenarios/event-listener-leak';
import { runTimerLeakScenario } from './scenarios/timer-leak';

const runtime = new RuntimeContext();

runtime.start();

runWebSocketLeakScenario(runtime);
// runEventListenerLeakScenario(runtime);
// runTimerLeakScenario(runtime);

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

runtime.stop();

console.log('Runtime stopped');
