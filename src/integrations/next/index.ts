export interface NextIntegrationOptions {
  port?: number;
}

export interface MemoryRuntimeIntelligenceNextConfig {
  port?: number;
}

export function memoryRuntimeIntelligence<T>(
  nextConfig: T,
  _options: NextIntegrationOptions = {},
): T {
  return nextConfig;
}

export default memoryRuntimeIntelligence;
