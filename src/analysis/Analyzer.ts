import type { AnalysisContext } from './AnalysisContext';
import type { Finding } from './Finding';
import type { Rule } from './Rule';

export class Analyzer {
  constructor(private readonly rules: readonly Rule[]) {}

  analyze(context: AnalysisContext): readonly Finding[] {
    const findings: Finding[] = [];

    for (const rule of this.rules) {
      findings.push(...rule.analyze(context));
    }

    return findings;
  }
}
