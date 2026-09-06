import type { SourceLocation } from '../core';
import type { ResourceOwner } from '../core/Resource';

/**
 * Determines resource ownership from a source location.
 *
 * NOTE:
 * New instrumentation should prefer captureSourceContext()
 * because ownership requires the complete stack, not just
 * one source location.
 */
export function determineResourceOwner(
  sourceLocation: SourceLocation,
): ResourceOwner {
  const file = sourceLocation.file?.trim().toLowerCase();

  /**
   * Unknown location cannot safely be attributed to
   * the application.
   */
  if (!file || file === 'unknown' || sourceLocation.line <= 0) {
    return 'runtime';
  }

  /**
   * A known source location is application-owned only
   * when it has already been classified as such.
   *
   * This function remains as a compatibility fallback.
   */
  return 'application';
}
