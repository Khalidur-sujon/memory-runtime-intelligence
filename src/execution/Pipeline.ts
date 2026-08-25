import { AnalysisContext, Analyzer } from '../analysis';
import { History } from '../history';
import { Renderer } from '../presentation';
import { Registry } from '../registry';

export class Pipeline {
  constructor(
    private readonly registry: Registry,
    private readonly history: History,
    private readonly analyzer: Analyzer,
    private readonly renderer: Renderer,
  ) {}

  run(): string {
    // 1. Collect resources
    const resources = this.registry.list();

    // 2. Create analysis contexts
    const context: AnalysisContext = {
      resources,
      history: this.history,
    };

    // 3. Analyze
    const findings = this.analyzer.analyze(context);

    // 4. Present result
    return this.renderer.render(findings);
  }
}
