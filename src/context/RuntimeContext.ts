import { InMemoryEventBus } from '../events';
import { RegistrySubscriber } from '../subscribers/RegistrySubscriber';
import { WebSocketInstrumentation } from '../instrumentation/WebSocketInstrumentation';
import { InMemoryRegistry } from '../registry';
import type { Registry } from '../registry/Registry';
import { InMemoryHistory, type History } from '../history';
import { HistorySubscriber } from '../subscribers/HistorySubscriber';
import { EventListenerInstrumentation } from '../instrumentation/EventListenerInstrumentation';

export class RuntimeContext {
  private readonly registry: Registry;

  private readonly history: History;

  private readonly eventBus: InMemoryEventBus;

  private readonly websocketInstrumentation: WebSocketInstrumentation;
  private readonly eventListenerInstrumentation: EventListenerInstrumentation;

  constructor() {
    this.registry = new InMemoryRegistry();

    this.history = new InMemoryHistory();

    this.eventBus = new InMemoryEventBus();

    const registrySubscriber = new RegistrySubscriber(this.registry);

    const historySubscriber = new HistorySubscriber(this.history);

    this.eventBus.subscribe(registrySubscriber);
    this.eventBus.subscribe(historySubscriber);

    this.websocketInstrumentation = new WebSocketInstrumentation(this.eventBus);
    this.eventListenerInstrumentation = new EventListenerInstrumentation(
      this.eventBus,
    );
  }

  start(): void {
    this.websocketInstrumentation.start();
    this.eventListenerInstrumentation.start();
  }

  stop(): void {
    this.websocketInstrumentation.stop();
    this.eventListenerInstrumentation.stop();
  }

  // For demo runner
  getEventBus(): InMemoryEventBus {
    return this.eventBus;
  }

  // For demo runner
  getRegistry(): Registry {
    return this.registry;
  }

  // For demo runner
  getHistory(): History {
    return this.history;
  }
}
