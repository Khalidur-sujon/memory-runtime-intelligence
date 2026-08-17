import type { Finding } from '../../analysis';
import { formatResourceType } from '../../utils/FormatResourceType';
import type { Renderer } from '../Renderer';

export class ConsoleRenderer implements Renderer {
  render(findings: readonly Finding[]): string {
    if (findings.length === 0) {
      return '✓ No issues detected.';
    }

    // Group similar findings together
    const groups = this.groupByMessage(findings);

    return Array.from(groups.entries())
      .map(([message, findings]) => {
        const lines: string[] = [];

        lines.push(`⚠ ${message}`);
        lines.push('');
        lines.push(`Detected Instances: ${findings.length}`);

        findings.forEach((finding) => {
          lines.push('');
          lines.push('────────────────────────────────────────');
          lines.push('');
          lines.push(this.renderFinding(finding));
        });

        return lines.join('\n');
      })
      .join('\n\n');
  }

  // Group findings by their message
  private groupByMessage(findings: readonly Finding[]): Map<string, Finding[]> {
    const groups = new Map<string, Finding[]>();

    for (const finding of findings) {
      const group = groups.get(finding.message);

      if (group) {
        group.push(finding);
      } else {
        groups.set(finding.message, [finding]);
      }
    }

    return groups;
  }

  // Render a single finding
  private renderFinding(finding: Finding): string {
    const lines: string[] = [];

    lines.push(`Resource Type: ${formatResourceType(finding.resourceType)}`);
    // lines.push(`Resource Group ID: ${finding.resourceGroupId}`);
    lines.push('');

    lines.push('Created at:');
    lines.push(
      `${finding.sourceLocation.file}:${finding.sourceLocation.line}:${finding.sourceLocation.column}`,
    );

    if (finding.details) {
      lines.push('');

      for (const [key, value] of Object.entries(finding.details)) {
        lines.push(`${this.formatLabel(key)}: ${value}`);
      }
    }

    lines.push('');
    lines.push(`Confidence: ${finding.confidence}`);

    lines.push('');
    lines.push('Recommendation:');
    lines.push(finding.recommendation);

    return lines.join('\n');
  }

  // Make labels easier to read
  private formatLabel(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
