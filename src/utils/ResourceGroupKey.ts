import type { SourceLocation } from '../core';

export function createResourceGroupKey(
  resourceType: string,
  sourceLocation: SourceLocation,
): string {
  return `${resourceType}:${JSON.stringify(sourceLocation)}`;
}
