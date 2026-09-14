export interface NextIntegrationOptions {
  port?: number;
}

export interface MemoryRuntimeIntelligenceNextConfig {
  port?: number;
  instrumentationClientInject?: string[];
}

const CLIENT_ENTRY = 'memory-runtime-intelligence/next/client';

export function memoryRuntimeIntelligence<T extends object>(
  nextConfig: T,
  _options: NextIntegrationOptions = {},
): T & MemoryRuntimeIntelligenceNextConfig {
  const config = nextConfig as T & MemoryRuntimeIntelligenceNextConfig;

  const existingClientInstrumentation =
    config.instrumentationClientInject ?? [];

  if (existingClientInstrumentation.includes(CLIENT_ENTRY)) {
    return config;
  }

  return {
    ...config,
    instrumentationClientInject: [
      ...existingClientInstrumentation,
      CLIENT_ENTRY,
    ],
  };
}

export default memoryRuntimeIntelligence;
