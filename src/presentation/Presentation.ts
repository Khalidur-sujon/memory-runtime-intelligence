import type { Finding } from '../analysis';
import type { Renderer } from './Renderer';

export class Presentation {
  constructor(private readonly renderer: Renderer) {}

  present(findings: readonly Finding[]): string {
    return this.renderer.render(findings);
  }
}
