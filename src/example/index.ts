import { RuntimeContext } from '../context/RuntimeContext';

import { runWebSocketLeakScenario } from './scenarios/websocket-leak';

import { Analyzer } from '../analysis/Analyzer';

import { UnreleasedResourceRule } from '../analysis/rules/UnreleasedResourceRule';

import type { AnalysisContext } from '../analysis/AnalysisContext';

const runtime = new RuntimeContext();

runtime.start();

console.log('Runtime started');

runWebSocketLeakScenario(runtime);

const registry = runtime.getRegistry();

const analyzer = new Analyzer([new UnreleasedResourceRule()]);

const analysisContext: AnalysisContext = {
  resources: registry.list(),
};

const findings = analyzer.analyze(analysisContext);

console.log('Analysis Findings:');

console.log(findings);

runtime.stop();

console.log('Runtime stopped');
