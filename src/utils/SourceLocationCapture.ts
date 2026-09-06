import type { SourceLocation } from '../core';
import type { ResourceOwner } from '../core/Resource';

export interface SourceContext {
  sourceLocation: SourceLocation;
  owner: ResourceOwner;
}

/**
 * Captures the complete source context from the current JavaScript stack.
 *
 * Stack traversal:
 *
 *   MRI runtime        -> ignored
 *   framework          -> remembered as framework
 *   infrastructure     -> ignored
 *   application        -> selected as source
 *
 * Example:
 *
 *   runtime-client.js
 *        ↓
 *   TimerInstrumentation
 *        ↓
 *   React
 *        ↓
 *   App.tsx
 *
 * Result:
 *
 *   sourceLocation = App.tsx
 *   owner          = application
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

  let frameworkDetected = false;

  for (const line of stackLines) {
    const parsed = parseStackLine(line);

    if (!parsed) {
      continue;
    }

    const normalized = normalizePath(parsed.filePath);
    const frameType = classifyFrame(
      normalized,
      parsed.lineNumber,
      parsed.columnNumber,
    );

    /**
     * MRI itself must never become the developer source.
     */
    if (frameType === 'runtime') {
      continue;
    }

    /**
     * A framework may be responsible for creating the resource.
     *
     * We remember that fact but continue walking the stack
     * to find the application source location.
     */
    if (frameType === 'framework') {
      frameworkDetected = true;
      continue;
    }

    /**
     * Bundlers, dev servers and dependencies are infrastructure.
     *
     * They must never become the developer source.
     */
    if (frameType === 'infrastructure') {
      continue;
    }

    /**
     * First real application frame.
     */
    if (frameType === 'application') {
      const sourceLocation: SourceLocation = {
        file: getFileName(parsed.filePath),
        line: parsed.lineNumber,
        column: parsed.columnNumber,
      };

      return {
        sourceLocation,
        owner: frameworkDetected ? 'framework' : 'application',
      };
    }
  }

  /**
   * No application frame was found.
   *
   * If a framework frame was encountered, the resource belongs
   * to the framework even though no useful application location
   * was available.
   */
  if (frameworkDetected) {
    return {
      sourceLocation: unknownLocation(),
      owner: 'framework',
    };
  }

  return {
    sourceLocation: unknownLocation(),
    owner: 'runtime',
  };
}

/**
 * Backward-compatible helper.
 */
export function captureSourceLocation(): SourceLocation {
  return captureSourceContext().sourceLocation;
}

type FrameType = 'runtime' | 'framework' | 'infrastructure' | 'application';

/**
 * Determines the semantic type of a stack frame.
 */
function classifyFrame(
  normalizedPath: string,
  lineNumber: number,
  columnNumber: number,
): FrameType {
  if (isRuntimeFrame(normalizedPath)) {
    return 'runtime';
  }

  if (isFrameworkFrame(normalizedPath)) {
    return 'framework';
  }

  if (isViteClientFrame(normalizedPath, lineNumber, columnNumber)) {
    return 'infrastructure';
  }

  if (isInfrastructureFrame(normalizedPath)) {
    return 'infrastructure';
  }

  return 'application';
}

/**
 * --------------------------------------------------
 * Runtime / instrumentation detection
 * --------------------------------------------------
 */
function isRuntimeFrame(normalizedPath: string): boolean {
  /**
   * Published/local MRI package.
   *
   * Examples:
   *
   * /node_modules/memory-runtime-intelligence/dist/...
   * /memory-runtime-intelligence/src/...
   */
  if (normalizedPath.includes('/memory-runtime-intelligence/')) {
    return true;
  }

  /**
   * MRI runtime source directories.
   *
   * Useful during local package development.
   */
  if (
    normalizedPath.includes('/src/utils/') ||
    normalizedPath.includes('/src/instrumentation/') ||
    normalizedPath.includes('/src/runtime/') ||
    normalizedPath.includes('/src/bootstrap/') ||
    normalizedPath.includes('/src/collector/') ||
    normalizedPath.includes('/src/analysis/')
  ) {
    return true;
  }

  /**
   * MRI browser runtime.
   *
   * Vite serves the runtime through:
   *
   * /__memory_runtime_intelligence__/runtime-client.js
   *
   * Depending on the browser and dev server, the stack may expose
   * only "runtime-client.js", so both forms are covered.
   */
  if (
    normalizedPath.includes(
      '/__memory_runtime_intelligence__/runtime-client.js',
    ) ||
    normalizedPath.includes('runtime-client.js')
  ) {
    return true;
  }

  /**
   * Browser / Node internal frames.
   */
  if (
    normalizedPath.startsWith('native ') ||
    normalizedPath.startsWith('node:') ||
    normalizedPath.startsWith('webpack://')
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
function isFrameworkFrame(normalizedPath: string): boolean {
  /**
   * React / React DOM
   */
  if (
    normalizedPath.includes('/react-dom/') ||
    normalizedPath.includes('/react-dom_') ||
    normalizedPath.includes('/react-dom.') ||
    normalizedPath.includes('react-dom_client') ||
    normalizedPath.includes('react-dom.development') ||
    normalizedPath.includes('react-dom.production') ||
    normalizedPath.includes('/react/') ||
    normalizedPath.includes('react.development') ||
    normalizedPath.includes('react.production')
  ) {
    return true;
  }

  /**
   * Vue
   */
  if (
    normalizedPath.includes('/vue/') ||
    normalizedPath.includes('/vue.runtime') ||
    normalizedPath.includes('vue.runtime') ||
    normalizedPath.includes('vue.global')
  ) {
    return true;
  }

  /**
   * Angular
   */
  if (
    normalizedPath.includes('/@angular/') ||
    normalizedPath.includes('/angular/') ||
    normalizedPath.includes('angular.core') ||
    normalizedPath.includes('angular.common')
  ) {
    return true;
  }

  /**
   * Svelte
   */
  if (
    normalizedPath.includes('/svelte/') ||
    normalizedPath.includes('svelte.js') ||
    normalizedPath.includes('svelte.internal')
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
function isInfrastructureFrame(normalizedPath: string): boolean {
  /**
   * --------------------------------------------------
   * Vite browser client / HMR client
   * --------------------------------------------------
   *
   * Vite can expose stack frames like:
   *
   *   client:912:43
   *   client:872:27
   *   client:415:11
   *
   * These are NOT application files.
   */

  /**
   * Vite internal paths.
   */
  if (
    normalizedPath.includes('/node_modules/.vite/') ||
    normalizedPath.includes('/@vite/') ||
    normalizedPath.includes('/vite/dist/') ||
    normalizedPath.includes('vite/dist/')
  ) {
    return true;
  }

  /**
   * Webpack.
   */
  if (
    normalizedPath.includes('/webpack/') ||
    normalizedPath.includes('webpack-dev-server')
  ) {
    return true;
  }

  /**
   * Rollup / esbuild.
   */
  if (
    normalizedPath.includes('/rollup/') ||
    normalizedPath.includes('/esbuild/')
  ) {
    return true;
  }

  /**
   * Any other node_modules dependency.
   *
   * Frameworks were already checked before this function,
   * so React/Vue/Angular/etc. won't be swallowed here.
   */
  if (normalizedPath.includes('/node_modules/')) {
    return true;
  }

  return false;
}

/**
 * Detects Vite's browser client stack locations.
 *
 * Supported examples:
 *
 *   client:912:43
 *   client:872:27
 *   client:415:11
 *
 * We intentionally allow whitespace because some browsers can
 * produce slightly different stack formatting.
 */
function isViteClientFrame(
  normalizedPath: string,
  lineNumber: number,
  columnNumber: number,
): boolean {
  return normalizedPath === 'client' && lineNumber > 0 && columnNumber > 0;
}
/**
 * --------------------------------------------------
 * Stack parsing
 * --------------------------------------------------
 */

/**
 * Parses common browser stack formats.
 *
 * Chrome / Edge / Node:
 *
 *   at functionName (http://localhost:5173/src/App.tsx:10:20)
 *   at http://localhost:5173/src/App.tsx:10:20
 *
 * Firefox / Safari:
 *
 *   functionName@http://localhost:5173/src/App.tsx:10:20
 *
 * Bare:
 *
 *   http://localhost:5173/src/App.tsx:10:20
 */
function parseStackLine(line: string): {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
} | null {
  const trimmed = line.trim();

  /**
   * Chrome / Edge / Node:
   *
   * at functionName (http://localhost:5173/src/App.tsx:10:20)
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
   * Chrome / Edge / Node:
   *
   * at http://localhost:5173/src/App.tsx:10:20
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
   * Firefox / Safari:
   *
   * functionName@http://localhost:5173/src/App.tsx:10:20
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
   * Bare location:
   *
   * http://localhost:5173/src/App.tsx:10:20
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
 * --------------------------------------------------
 * Path utilities
 * --------------------------------------------------
 */

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
 * --------------------------------------------------
 * Fallback
 * --------------------------------------------------
 */

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
