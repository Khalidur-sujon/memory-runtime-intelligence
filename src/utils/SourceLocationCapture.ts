import type { SourceLocation } from '../core';
import type { ResourceOwner } from '../core/Resource';

export interface SourceContext {
  sourceLocation: SourceLocation;
  owner: ResourceOwner;
  scriptUrl?: string;
}

type FrameType =
  'runtime' | 'framework' | 'infrastructure' | 'application' | 'unknown';

/**
 * Captures the complete source context from the current JavaScript stack.
 *
 * Stack traversal:
 *   MRI runtime        -> ignored
 *   framework          -> remembered as framework
 *   infrastructure    -> ignored
 *   application       -> selected as source
 *   unknown            -> ignored
 *
 * The first qualified application frame becomes the source location.
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

    const normalizedPath = normalizePath(parsed.filePath);

    const frameType = classifyFrame(
      normalizedPath,
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
     * Remember that fact but continue walking the stack
     * to find the application source location.
     */
    if (frameType === 'framework') {
      frameworkDetected = true;
      continue;
    }

    /**
     * Bundlers, dev servers, virtual modules, and dependencies
     * must never become the developer source.
     */
    if (frameType === 'infrastructure') {
      continue;
    }

    /**
     * Unknown frames are not trusted as application frames.
     */
    if (frameType === 'unknown') {
      continue;
    }

    /**
     * The first qualified application frame becomes the source.
     */
    if (frameType === 'application') {
      const sourceLocation: SourceLocation = {
        file: getFileName(parsed.filePath),
        line: parsed.lineNumber,
        column: parsed.columnNumber,
      };

      const scriptUrl =
        parsed.filePath.startsWith('http://') ||
        parsed.filePath.startsWith('https://')
          ? parsed.filePath
          : undefined;

      return {
        sourceLocation,
        owner: frameworkDetected ? 'framework' : 'application',
        scriptUrl,
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

/**
 * Determines the semantic type of a stack frame.
 *
 * Application is intentionally not the default fallback.
 * A frame must explicitly qualify as application code.
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

  if (isInfrastructureFrame(normalizedPath)) {
    return 'infrastructure';
  }

  if (isApplicationFrame(normalizedPath, lineNumber, columnNumber)) {
    return 'application';
  }

  return 'unknown';
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
   *   /node_modules/memory-runtime-intelligence/dist/...
   *   /memory-runtime-intelligence/src/...
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
   *   /__memory_runtime_intelligence__/runtime-client.js
   *
   * Some browsers may expose only:
   *   runtime-client.js
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
   * Browser and Node internal frames.
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
   * React / React DOM.
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
   * Vue.
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
   * Angular.
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
   * Svelte.
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
   * Known Vite browser client / HMR client paths.
   *
   * Examples:
   *   vite/client
   *   vite/client:912:43
   *
   * The parser removes the line and column numbers before
   * this function receives the path.
   */
  if (isVirtualClientPath(normalizedPath)) {
    return true;
  }

  /**
   * Next.js / Turbopack generated runtime and development assets.
   */
  if (
    normalizedPath.includes('/_next/') ||
    normalizedPath.includes('/.next/') ||
    normalizedPath.includes('/next/dist/') ||
    normalizedPath.includes('turbopack') ||
    isGeneratedChunk(normalizedPath)
  ) {
    return true;
  }

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
    normalizedPath.includes('webpack-dev-server') ||
    normalizedPath.includes('webpack/client')
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
   * Generic development server infrastructure.
   */
  if (
    normalizedPath.includes('webpack-dev-server') ||
    normalizedPath.includes('hot-update') ||
    normalizedPath.includes('__webpack') ||
    normalizedPath.includes('__vite')
  ) {
    return true;
  }

  /**
   * Any node_modules dependency is infrastructure unless it was
   * already identified as a framework above.
   */
  if (normalizedPath.includes('/node_modules/')) {
    return true;
  }

  return false;
}

/**
 * Detects virtual client paths such as:
 *
 *   vite/client
 *   webpack/client
 *   vue/client
 *   angular/client
 *   astro/client
 *
 * This is intentionally based on the virtual-module shape rather
 * than treating every file containing the word "client" as
 * infrastructure.
 */
function isVirtualClientPath(normalizedPath: string): boolean {
  return /^[a-z0-9@_-]+\/client$/.test(normalizedPath);
}

/**
 * --------------------------------------------------
 * Application detection
 * --------------------------------------------------
 */

/**
 * Determines whether a frame qualifies as application code.
 *
 * A frame is considered application code only when:
 *   1. It has a valid source-file extension.
 *   2. It is not MRI runtime code.
 *   3. It is not framework code.
 *   4. It is not infrastructure.
 *   5. It is not a dependency.
 *   6. It has a valid stack location.
 */
function isApplicationFrame(
  normalizedPath: string,
  lineNumber: number,
  columnNumber: number,
): boolean {
  /**
   * A valid source location requires positive line and column numbers.
   */
  if (lineNumber <= 0 || columnNumber <= 0) {
    return false;
  }

  /**
   * Virtual or extensionless paths are not trusted as application files.
   */
  if (!hasFileExtension(normalizedPath)) {
    return false;
  }

  /**
   * MRI runtime frames must never become application sources.
   */
  if (isRuntimeFrame(normalizedPath)) {
    return false;
  }

  /**
   * Framework internals must never become application sources.
   */
  if (isFrameworkFrame(normalizedPath)) {
    return false;
  }

  /**
   * Bundlers, dev servers, and dependencies must never become
   * application sources.
   */
  if (isInfrastructureFrame(normalizedPath)) {
    return false;
  }

  /**
   * Dependencies must never become application sources.
   */
  if (normalizedPath.includes('/node_modules/')) {
    return false;
  }

  /**
   * Only recognized source-file extensions qualify.
   */
  if (!hasSourceExtension(normalizedPath)) {
    return false;
  }

  return true;
}

/**
 * Checks whether the path contains a file extension.
 */
function hasFileExtension(normalizedPath: string): boolean {
  const cleanPath = removeQueryAndHash(normalizedPath);
  const fileName = cleanPath.split('/').pop() ?? cleanPath;

  return /\.[a-z0-9]+$/i.test(fileName);
}

/**
 * Checks whether the file uses a supported application source extension.
 */
function hasSourceExtension(normalizedPath: string): boolean {
  const cleanPath = removeQueryAndHash(normalizedPath);
  const fileName = cleanPath.split('/').pop() ?? cleanPath;

  return /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|astro)$/.test(fileName);
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
 *   at functionName (http://localhost:5173/src/App.tsx:10:20)
 *
 * Chrome / Edge / Node:
 *   at http://localhost:5173/src/App.tsx:10:20
 *
 * Firefox / Safari:
 *   functionName@http://localhost:5173/src/App.tsx:10:20
 *
 * Bare:
 *   http://localhost:5173/src/App.tsx:10:20
 */
function parseStackLine(line: string): {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  scriptUrl?: string;
} | null {
  const trimmed = line.trim();

  /**
   * Chrome / Edge / Node:
   *
   *   at functionName (http://localhost:5173/src/App.tsx:10:20)
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
   *   at http://localhost:5173/src/App.tsx:10:20
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
   *   functionName@http://localhost:5173/src/App.tsx:10:20
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
   *   http://localhost:5173/src/App.tsx:10:20
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
 * Removes query strings and hash fragments.
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

function isGeneratedChunk(normalizedPath: string): boolean {
  const fileName =
    removeQueryAndHash(normalizedPath).split('/').pop() ?? normalizedPath;

  return (
    /^_[a-z0-9]+(?:\._)?\.js$/i.test(fileName) ||
    /^_[a-z0-9]+_\.js$/i.test(fileName)
  );
}
