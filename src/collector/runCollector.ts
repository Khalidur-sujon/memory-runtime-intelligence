import { RuntimeCollector } from './RuntimeCollector';

const collector = new RuntimeCollector();

collector.start();

const shutdown = async () => {
  await collector.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
