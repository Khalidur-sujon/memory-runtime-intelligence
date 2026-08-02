import type { Finding } from '../analysis';

export interface Renderer {
  render(findings: readonly Finding[]): string;
}
