import { InMemoryEventBus } from '../events';
import { RegistrySubscriber } from '../subscribers/RegistrySubscriber';
import { WebSocketInstrumentation } from '../instrumentation/WebSocketInstrumentation';
import { InMemoryRegistry } from '../registry/InMemoryRegistry';
import type { Registry } from '../registry/Registry';

export class RuntimeContext {
  private readonly registry: Registry;

  private readonly eventBus: InMemoryEventBus;

  private readonly websocketInstrumentation: WebSocketInstrumentation;

  constructor() {
    this.registry = new InMemoryRegistry();

    this.eventBus = new InMemoryEventBus();

    const registrySubscriber = new RegistrySubscriber(this.registry);

    this.eventBus.subscribe(registrySubscriber);

    this.websocketInstrumentation = new WebSocketInstrumentation(this.eventBus);
  }

  start(): void {
    this.websocketInstrumentation.start();
  }

  stop(): void {
    this.websocketInstrumentation.stop();
  }

  getRegistry(): Registry {
    return this.registry;
  }
}
