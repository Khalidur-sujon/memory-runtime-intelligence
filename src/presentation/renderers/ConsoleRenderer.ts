import type { Finding } from '../../analysis';
import { formatResourceType } from '../../utils/FormatResourceType';
import type { Renderer } from '../Renderer';

export class ConsoleRenderer implements Renderer {
  render(findings: readonly Finding[]): string {
    if (findings.length === 0) {
      return [
        '',
        'memory-runtime-intelligence',
        '',
        '✓ No issues detected.',
        '',
      ].join('\n');
    }

    const lines: string[] = [];

    const highConfidence = findings.filter(
      (finding) => finding.confidence === 'HIGH',
    );

    const mediumConfidence = findings.filter(
      (finding) => finding.confidence === 'MEDIUM',
    );

    const unreleasedResources = findings.reduce(
      (total, finding) => total + this.getUnreleasedCount(finding),
      0,
    );

    const resourceCounts = this.countResourceTypes(findings);

    // ==================================================
    // Header
    // ==================================================

    lines.push('');
    lines.push('');
    lines.push('⚠ Potential Memory Retention');
    lines.push('');

    lines.push(
      `${findings.length} issue${findings.length === 1 ? '' : 's'} detected`,
    );

    lines.push(this.formatResourceSummary(resourceCounts));

    lines.push('');

    if (highConfidence.length > 0) {
      lines.push(`🔴 ${highConfidence.length} high confidence`);
    }

    if (mediumConfidence.length > 0) {
      lines.push(`🟡 ${mediumConfidence.length} medium confidence`);
    }

    lines.push('');
    lines.push(`${unreleasedResources} resources unreleased`);

    // ==================================================
    // High confidence findings
    // ==================================================

    if (highConfidence.length > 0) {
      lines.push('');
      lines.push('────────────────────────────────────────');
      lines.push('HIGH CONFIDENCE');
      lines.push('────────────────────────────────────────');

      this.renderFindings(lines, highConfidence, 1);
    }

    // ==================================================
    // Medium confidence findings
    // ==================================================

    if (mediumConfidence.length > 0) {
      lines.push('');
      lines.push('────────────────────────────────────────');
      lines.push('MEDIUM CONFIDENCE');
      lines.push('────────────────────────────────────────');

      this.renderFindings(lines, mediumConfidence, highConfidence.length + 1);
    }

    // ==================================================
    // Footer
    // ==================================================

    lines.push('');
    lines.push('────────────────────────────────────────');
    lines.push('');
    lines.push('💡 Start with the HIGH confidence findings.');
    lines.push('');

    return lines.join('\n');
  }

  // ==================================================
  // Render findings
  // ==================================================

  private renderFindings(
    lines: string[],
    findings: readonly Finding[],
    startIndex: number,
  ): void {
    findings.forEach((finding, index) => {
      const number = startIndex + index;

      lines.push('');
      lines.push(`${number}. ${formatResourceType(finding.resourceType)}`);

      lines.push(
        `   📍 ${finding.sourceLocation.file}:${finding.sourceLocation.line}:${finding.sourceLocation.column}`,
      );

      if (finding.details) {
        const details = this.formatDetails(finding.details);

        if (details) {
          lines.push('');
          lines.push(`   📊 ${details}`);
        }
      }

      lines.push('');
      lines.push(`   💡 ${finding.recommendation}`);

      if (index < findings.length - 1) {
        lines.push('');
        lines.push('   ───────────────────────────────────');
      }
    });
  }

  // ==================================================
  // Resource summary
  // ==================================================

  private countResourceTypes(
    findings: readonly Finding[],
  ): Map<string, number> {
    const counts = new Map<string, number>();

    for (const finding of findings) {
      const resourceType = formatResourceType(finding.resourceType);

      counts.set(resourceType, (counts.get(resourceType) ?? 0) + 1);
    }

    return counts;
  }

  private formatResourceSummary(counts: Map<string, number>): string {
    return Array.from(counts.entries())
      .map(([type, count]) => {
        return `${count} ${this.pluralize(type, count)}`;
      })
      .join(' · ');
  }

  private pluralize(type: string, count: number): string {
    if (count === 1) {
      return type;
    }

    if (type === 'timer-interval') {
      return 'timer intervals';
    }

    if (type.endsWith('s')) {
      return type;
    }

    return `${type}s`;
  }

  // ==================================================
  // Finding details
  // ==================================================

  private formatDetails(details: Record<string, unknown>): string {
    const created = details.created;
    const released = details.released;
    const unreleased = details.unreleased;

    if (
      created !== undefined &&
      released !== undefined &&
      unreleased !== undefined
    ) {
      return (
        `${created} created · ` +
        `${released} released · ` +
        `${unreleased} unreleased`
      );
    }

    return Object.entries(details)
      .map(([key, value]) => {
        return `${this.formatLabel(key)}: ${value}`;
      })
      .join(' · ');
  }

  private getUnreleasedCount(finding: Finding): number {
    const unreleased = finding.details?.unreleased;

    return typeof unreleased === 'number' ? unreleased : 0;
  }

  private formatLabel(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
