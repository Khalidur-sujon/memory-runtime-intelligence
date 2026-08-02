import type { AnalysisContext } from './AnalysisContext';
import type { Finding } from './Finding';

export interface Rule {
  analyze(context: AnalysisContext): readonly Finding[];
}
