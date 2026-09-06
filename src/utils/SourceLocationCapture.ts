import type { SourceLocation } from '../core';
import type { ResourceOwner } from '../core/Resource';

export interface SourceContext {
  sourceLocation: SourceLocation;
  owner: ResourceOwner;
}

/**
 * Captures the source context from the current JavaScript stack.
 *
 * The complete stack is inspected.
 *
 * Ownership is determined from the first meaningful frame:
 *
 *   instrumentation/runtime -> skipped
 *   framework              -> owner = framework
 *   application            -> owner = application
 *
 * The application source location is still preserved when possible,
 * even when the resource itself belongs to a framework.
 */
export function captureSourceContext(): SourceContext {
  const stack = new Error().stack;

  if (!stack) {
    return {
      sourceLocation: unknownLocation(),
      owner: 'runtime',
    };
  }

  const stackLines = stack.split('\n');

  let firstApplicationLocation: SourceLocation | undefined;

  for (const line of stackLines) {
    const parsed = parseStackLine(line);

    if (!parsed) {
      continue;
    }

    const { filePath, lineNumber, columnNumber } = parsed;
    const normalized = normalizePath(filePath);

    const frameType = classifyFrame(normalized);

    /**
     * Our instrumentation/runtime must never become the
     * developer source location.
     */
    if (frameType === 'runtime') {
      continue;
    }

    /**
     * Framework frame is the first meaningful frame.
     *
     * This means the resource was created by the framework,
     * even if an application frame exists later in the stack.
     */
    if (frameType === 'framework') {
      /**
       * We still continue walking the stack so that we can
       * find the nearest application source location.
       */
      const applicationLocation = findApplicationLocation(stackLines);

      return {
        sourceLocation: applicationLocation ?? unknownLocation(),
        owner: 'framework',
      };
    }

    /**
     * Bundlers/dev servers/dependencies are infrastructure.
     * They should not become the owner.
     */
    if (frameType === 'infrastructure') {
      continue;
    }

    /**
     * First useful application frame.
     */
    if (frameType === 'application') {
      firstApplicationLocation = {
        file: getFileName(filePath),
        line: lineNumber,
        column: columnNumber,
      };

      return {
        sourceLocation: firstApplicationLocation,
        owner: 'application',
      };
    }
  }

  return {
    sourceLocation: unknownLocation(),
    owner: 'runtime',
  };
}

/**
 * Backward-compatible helper.
 *
 * Returns only the source location.
 */
export function captureSourceLocation(): SourceLocation {
  return captureSourceContext().sourceLocation;
}

type FrameType = 'runtime' | 'framework' | 'infrastructure' | 'application';

/**
 * Determines the semantic type of a stack frame.
 */
function classifyFrame(normalizedPath: string): FrameType {
  /**
   * --------------------------------------------------
   * Our runtime / instrumentation
   * --------------------------------------------------
   */
  if (isRuntimeFrame(normalizedPath)) {
    return 'runtime';
  }

  /**
   * --------------------------------------------------
   * Frameworks
   * --------------------------------------------------
   */
  if (isFrameworkFrame(normalizedPath)) {
    return 'framework';
  }

  /**
   * --------------------------------------------------
   * Bundlers / dev servers / generic dependencies
   * --------------------------------------------------
   */
  if (isInfrastructureFrame(normalizedPath)) {
    return 'infrastructure';
  }

  /**
   * --------------------------------------------------
   * Application
   * --------------------------------------------------
   */
  return 'application';
}

/**
 * Finds the first useful application frame in the stack.
 *
 * This is mainly used when a framework frame owns the
 * resource but we still want to show where application
 * initialization eventually originated.
 */
function findApplicationLocation(
  stackLines: string[],
): SourceLocation | undefined {
  for (const line of stackLines) {
    const parsed = parseStackLine(line);

    if (!parsed) {
      continue;
    }

    const normalized = normalizePath(parsed.filePath);

    if (
      isRuntimeFrame(normalized) ||
      isFrameworkFrame(normalized) ||
      isInfrastructureFrame(normalized)
    ) {
      continue;
    }

    return {
      file: getFileName(parsed.filePath),
      line: parsed.lineNumber,
      column: parsed.columnNumber,
    };
  }

  return undefined;
}

/**
 * --------------------------------------------------
 * Runtime / instrumentation detection
 * --------------------------------------------------
 */
function isRuntimeFrame(normalized: string): boolean {
  /**
   * Our package.
   */
  if (normalized.includes('/memory-runtime-intelligence/')) {
    return true;
  }

  /**
   * Local runtime source folders.
   *
   * Important during local package development where
   * the package name may not appear in the path.
   */
  if (
    normalized.includes('/src/utils/') ||
    normalized.includes('/src/instrumentation/') ||
    normalized.includes('/src/runtime/') ||
    normalized.includes('/src/bootstrap/') ||
    normalized.includes('/src/collector/') ||
    normalized.includes('/src/analysis/')
  ) {
    return true;
  }

  /**
   * Node/browser internal frames.
   */
  if (
    normalized.startsWith('native ') ||
    normalized.startsWith('node:') ||
    normalized.startsWith('webpack://')
  ) {
    return true;
  }

  return false;
}

/**
 * --------------------------------------------------
 * Framework detection
 * --------------------------------------------------
 */
function isFrameworkFrame(normalized: string): boolean {
  /**
   * React / React DOM
   */
  if (
    normalized.includes('/react-dom/') ||
    normalized.includes('/react-dom_') ||
    normalized.includes('/react-dom.') ||
    normalized.includes('react-dom_client') ||
    normalized.includes('react-dom.development') ||
    normalized.includes('react-dom.production') ||
    normalized.includes('/react/') ||
    normalized.includes('react.development') ||
    normalized.includes('react.production')
  ) {
    return true;
  }

  /**
   * Vue
   */
  if (
    normalized.includes('/vue/') ||
    normalized.includes('/vue.runtime') ||
    normalized.includes('vue.runtime') ||
    normalized.includes('vue.global')
  ) {
    return true;
  }

  /**
   * Angular
   */
  if (
    normalized.includes('/@angular/') ||
    normalized.includes('/angular/') ||
    normalized.includes('angular.core') ||
    normalized.includes('angular.common')
  ) {
    return true;
  }

  /**
   * Svelte
   */
  if (
    normalized.includes('/svelte/') ||
    normalized.includes('svelte.js') ||
    normalized.includes('svelte.internal')
  ) {
    return true;
  }

  return false;
}

/**
 * --------------------------------------------------
 * Infrastructure detection
 * --------------------------------------------------
 */
function isInfrastructureFrame(normalized: string): boolean {
  /**
   * Vite
   */
  if (
    normalized.includes('/node_modules/.vite/') ||
    normalized.includes('/@vite/') ||
    normalized.includes('/vite/dist/') ||
    normalized.includes('vite/dist/')
  ) {
    return true;
  }

  /**
   * Webpack
   */
  if (
    normalized.includes('/webpack/') ||
    normalized.includes('webpack-dev-server')
  ) {
    return true;
  }

  /**
   * Rollup / esbuild
   */
  if (normalized.includes('/rollup/') || normalized.includes('/esbuild/')) {
    return true;
  }

  /**
   * Any other dependency.
   */
  if (normalized.includes('/node_modules/')) {
    return true;
  }

  return false;
}

/**
 * Parses common browser stack formats:
 *
 *   at functionName (file.ts:10:20)
 *   at file.ts:10:20
 *   functionName@file.ts:10:20
 *   file.ts:10:20
 */
function parseStackLine(line: string): {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
} | null {
  const trimmed = line.trim();

  /**
   * Chrome / Edge / Node
   *
   * at functionName (http://localhost:5173/src/main.tsx:10:20)
   */
  const withParentheses = trimmed.match(/\((.+):(\d+):(\d+)\)$/);

  if (withParentheses) {
    return {
      filePath: withParentheses[1],
      lineNumber: Number(withParentheses[2]),
      columnNumber: Number(withParentheses[3]),
    };
  }

  /**
   * Chrome / Edge / Node
   *
   * at http://localhost:5173/src/main.tsx:10:20
   */
  const withAt = trimmed.match(/^at\s+(.+):(\d+):(\d+)$/);

  if (withAt) {
    return {
      filePath: withAt[1],
      lineNumber: Number(withAt[2]),
      columnNumber: Number(withAt[3]),
    };
  }

  /**
   * Firefox / Safari
   *
   * functionName@http://localhost:5173/src/main.tsx:10:20
   */
  const withFunctionName = trimmed.match(/^.*@(.+):(\d+):(\d+)$/);

  if (withFunctionName) {
    return {
      filePath: withFunctionName[1],
      lineNumber: Number(withFunctionName[2]),
      columnNumber: Number(withFunctionName[3]),
    };
  }

  /**
   * Bare location
   *
   * http://localhost:5173/src/main.tsx:10:20
   */
  const bareLocation = trimmed.match(/^(.+):(\d+):(\d+)$/);

  if (bareLocation) {
    return {
      filePath: bareLocation[1],
      lineNumber: Number(bareLocation[2]),
      columnNumber: Number(bareLocation[3]),
    };
  }

  return null;
}

/**
 * Normalizes Windows and Unix paths.
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase().trim();
}

/**
 * Extracts only the filename from the full source path.
 */
function getFileName(filePath: string): string {
  const cleanPath = removeQueryAndHash(filePath);

  return cleanPath.split('/').pop() ?? cleanPath;
}

/**
 * Removes Vite query strings and hash fragments.
 */
function removeQueryAndHash(filePath: string): string {
  return filePath.split('?')[0].split('#')[0];
}

/**
 * Fallback location when no useful source frame exists.
 */
function unknownLocation(): SourceLocation {
  return {
    file: 'unknown',
    line: 0,
    column: 0,
  };
}
