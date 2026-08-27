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
import { RuntimeStorage } from '../runtime/RuntimeStorage';
import { SnapshotScheduler } from '../runtime/SnapshotScheduler';
import { RuntimeStaleDetector } from '../runtime/RuntimeStaleDetector';
import { RuntimeStateChecker } from '../runtime/RuntimeStateChecker';
import { InstrumentationScope } from '../instrumentation/InstrumentationScope';

export class RuntimeContext {
  private readonly registry: Registry;

  private readonly history: History;

  private readonly eventBus: InMemoryEventBus;

  private readonly websocketInstrumentation: WebSocketInstrumentation;
  private readonly eventListenerInstrumentation: EventListenerInstrumentation;
  private readonly timerInstrumentation: TimerInstrumentation;
  private readonly ObserverInstrumentation: ObserverInstrumentation;

  private readonly session: RuntimeSession;
  private readonly storage: RuntimeStorage;
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

    this.websocketInstrumentation = new WebSocketInstrumentation(this.eventBus);
    this.eventListenerInstrumentation = new EventListenerInstrumentation(
      this.eventBus,
    );

    this.timerInstrumentation = new TimerInstrumentation(
      this.eventBus,
      this.instrumentationScope,
    );
    this.ObserverInstrumentation = new ObserverInstrumentation(this.eventBus);

    this.session = new RuntimeSession();

    this.storage = new RuntimeStorage();

    this.snapshotScheduler = new SnapshotScheduler(
      this.registry,
      this.history,
      this.storage,
      this.session.getSessionId(),
      this.session.getStartedAt(),
    );
  }

  async start(): Promise<void> {
    const staleDetector = new RuntimeStaleDetector();

    const stateChecker = new RuntimeStateChecker(this.storage, staleDetector);

    const stale = await stateChecker.isStale();

    if (stale) {
      await this.storage.removeDirectory();
    }

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
  }

  async stop(): Promise<void> {
    this.snapshotScheduler.stop();

    this.websocketInstrumentation.stop();
    this.eventListenerInstrumentation.stop();
    this.timerInstrumentation.stop();

    await this.storage.removeDirectory();

    this.session.shutdown();
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

    await this.storage.clearSnapshot();

    this.session.reset();
  }
}
