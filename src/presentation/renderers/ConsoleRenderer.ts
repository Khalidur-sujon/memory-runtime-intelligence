import type { Finding } from '../../analysis';
import type { Renderer } from '../Renderer';

export class ConsoleRenderer implements Renderer {
  render(findings: Finding[]): string {
    return findings
      .map((finding) => `⚠ ${finding.message} (${finding.resourceId})`)
      .join('\n');
  }
}
