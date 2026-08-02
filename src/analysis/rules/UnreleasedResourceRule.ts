import type { Finding } from '../Finding';
import type { Rule } from '../Rule';
import type { AnalysisContext } from '../AnalysisContext';

export class UnreleasedResourceRule implements Rule {
  analyze(context: AnalysisContext): readonly Finding[] {
    return context.resources
      .filter((resource) => resource.state === 'observed')
      .map((resource) => ({
        resourceId: resource.id,
        message: 'Resource has not been released.',
      }));
  }
}
