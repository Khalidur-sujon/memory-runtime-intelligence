import type { SourceLocation } from '../core';

export function captureSourceLocation(): SourceLocation {
  const stack = new Error().stack;

  if (!stack) {
    return {
      file: 'unknown',
      line: 0,
      column: 0,
    };
  }

  const stackLines = stack.split('\n');

  for (const line of stackLines) {
    const match = line.match(/\((.*):(\d+):(\d+)\)/);

    if (!match) {
      continue;
    }

    const filePath = match[1];

    if (
      filePath.includes('/src/utils/') ||
      filePath.includes('/src/instrumentation/')
    ) {
      continue;
    }

    return {
      file: getFileName(filePath),
      line: Number(match[2]),
      column: Number(match[3]),
    };
  }

  return {
    file: 'unknown',
    line: 0,
    column: 0,
  };
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
