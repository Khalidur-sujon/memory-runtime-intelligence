import { InMemoryEventBus } from '../events';
import { RegistrySubscriber } from '../subscribers/RegistrySubscriber';
import { WebSocketInstrumentation } from '../instrumentation/WebSocketInstrumentation';
import { InMemoryRegistry } from '../registry';
import type { Registry } from '../registry/Registry';
import { InMemoryHistory, type History } from '../history';
import { HistorySubscriber } from '../subscribers/HistorySubscriber';
import { EventListenerInstrumentation } from '../instrumentation/EventListenerInstrumentation';
import { TimerInstrumentation } from '../instrumentation/TimerInstrumentation';
import { ObserverInstrumentation } from '../instrumentation/ObserverInstrumentation';
import { RuntimeSession } from '../runtime/RuntimeSession';
import { SnapshotScheduler } from '../runtime/SnapshotScheduler';
import { InstrumentationScope } from '../instrumentation/InstrumentationScope';
import { RuntimeWebSocketTransport } from '../runtime/RuntimeWebSocketTransport';

export class RuntimeContext {
  private started = false;

  private starting = false;

  private readonly registry: Registry;

  private readonly history: History;

  private readonly eventBus: InMemoryEventBus;

  private readonly websocketInstrumentation: WebSocketInstrumentation;

  private readonly eventListenerInstrumentation: EventListenerInstrumentation;

  private readonly timerInstrumentation: TimerInstrumentation;

  private readonly ObserverInstrumentation: ObserverInstrumentation;

  private readonly runtimeWebSocketTransport: RuntimeWebSocketTransport;

  private readonly session: RuntimeSession;

  private readonly snapshotScheduler: SnapshotScheduler;

  private readonly instrumentationScope: InstrumentationScope;

  constructor() {
    this.registry = new InMemoryRegistry();
    this.history = new InMemoryHistory();
    this.eventBus = new InMemoryEventBus();

    this.instrumentationScope = new InstrumentationScope();

    const registrySubscriber = new RegistrySubscriber(this.registry);
    const historySubscriber = new HistorySubscriber(this.history);

    this.eventBus.subscribe(registrySubscriber);
    this.eventBus.subscribe(historySubscriber);

    this.runtimeWebSocketTransport = new RuntimeWebSocketTransport(
      this.instrumentationScope,
    );

    this.websocketInstrumentation = new WebSocketInstrumentation(
      this.eventBus,
      this.instrumentationScope,
    );

    this.eventListenerInstrumentation = new EventListenerInstrumentation(
      this.eventBus,
      this.instrumentationScope,
    );

    this.timerInstrumentation = new TimerInstrumentation(
      this.eventBus,
      this.instrumentationScope,
    );

    this.ObserverInstrumentation = new ObserverInstrumentation(this.eventBus);

    this.session = new RuntimeSession();

    this.snapshotScheduler = new SnapshotScheduler(
      this.registry,
      this.history,
      this.runtimeWebSocketTransport,
      this.session.getSessionId(),
      this.session.getStartedAt(),
    );
  }

  async start(): Promise<void> {
    if (this.started || this.starting) {
      return;
    }

    this.starting = true;

    try {
      this.session.start();

      this.websocketInstrumentation.start();

      this.eventListenerInstrumentation.start();

      this.timerInstrumentation.start();

      this.ObserverInstrumentation.start();

      this.instrumentationScope.enterInternal();

      try {
        this.snapshotScheduler.start();
      } finally {
        this.instrumentationScope.exitInternal();
      }

      this.started = true;
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.snapshotScheduler.stop();

    this.websocketInstrumentation.stop();

    this.eventListenerInstrumentation.stop();

    this.timerInstrumentation.stop();

    this.ObserverInstrumentation.stop();

    this.session.shutdown();

    this.started = false;
  }

  getSessionId(): string {
    return this.session.getSessionId();
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

  async reset(): Promise<void> {
    this.registry.clear();

    this.history.clear();

    this.session.reset();
  }
}
