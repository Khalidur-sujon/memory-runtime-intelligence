import type { Finding } from '../../analysis';
import type { Renderer } from '../Renderer';

export class ConsoleRenderer implements Renderer {
  render(findings: readonly Finding[]): string {
    if (findings.length === 0) {
      return '✓ No issues detected.';
    }

    return findings
      .map((finding) => {
        const lines: string[] = [];

        lines.push(`⚠ ${finding.message}`);
        lines.push(`Resource: ${finding.resourceId}`);

        if (finding.details) {
          for (const [key, value] of Object.entries(finding.details)) {
            lines.push(`${this.formatLabel(key)}: ${value}`);
          }
        }

        return lines.join('\n');
      })
      .join('\n\n');
  }

  private formatLabel(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
