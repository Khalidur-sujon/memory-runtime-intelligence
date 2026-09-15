import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

export interface GeneratedLocation {
  file: string;
  line: number;
  column: number;
}

export interface ResolvedLocation {
  file: string;
  line: number;
  column: number;
}

export function resolveGeneratedLocation(
  sourceMap: unknown,
  location: GeneratedLocation,
): ResolvedLocation | null {
  try {
    const traceMap = new TraceMap(sourceMap as any);

    const original = originalPositionFor(traceMap, {
      line: location.line,
      // Browser stack columns are 1-based.
      // Source maps use 0-based columns.
      column: Math.max(0, location.column - 1),
    });

    if (!original.source || original.line == null || original.column == null) {
      return null;
    }

    return {
      file: getFileName(original.source),
      line: original.line,
      // Source-map column is 0-based → developer-facing location is 1-based.
      column: original.column + 1,
    };
  } catch {
    return null;
  }
}

function getFileName(source: string): string {
  const cleanSource = source.split('?')[0].split('#')[0];

  return cleanSource.split('/').pop() ?? cleanSource;
}
