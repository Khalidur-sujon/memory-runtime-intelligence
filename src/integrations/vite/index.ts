import { readFile } from 'node:fs/promises';
import { RuntimeCollector } from '../../collector/RuntimeCollector';

const RUNTIME_CLIENT_URL = '/__memory_runtime_intelligence__/runtime-client.js';

const memoryRuntimeIntelligence = () => {
  let collector: RuntimeCollector | undefined;

  return {
    name: 'memory-runtime-intelligence',

    apply: 'serve' as const,

    configureServer(server: {
      middlewares: {
        use(
          path: string,
          handler: (
            req: {
              url?: string;
            },
            res: {
              statusCode: number;
              setHeader(name: string, value: string): void;
              end(body?: string | Buffer): void;
            },
            next: () => void,
          ) => void,
        ): void;
      };
    }) {
      collector = new RuntimeCollector();
      collector.start();

      server.middlewares.use(RUNTIME_CLIENT_URL, async (_req, res, next) => {
        try {
          const runtimeClientPath = new URL(
            './runtime-client.js',
            import.meta.url,
          );

          const runtimeClient = await readFile(runtimeClientPath, 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript');
          res.end(runtimeClient);
        } catch (error) {
          console.error('[MRI] Failed to serve runtime client:', error);

          next();
        }
      });
    },

    transformIndexHtml(html: string) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: {
              type: 'module',
              src: RUNTIME_CLIENT_URL,
            },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
};

export default memoryRuntimeIntelligence;
