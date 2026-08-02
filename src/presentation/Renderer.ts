import type { Finding } from '../analysis';

export interface Renderer {
  render(findings: Finding[]): string;
}
