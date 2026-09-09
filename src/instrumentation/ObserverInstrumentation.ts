import type { ResourceIdentity } from '../core';
import type { EventPublisher } from '../events';

import { ObserverCreatedEvent } from '../events/observer/ObserverCreatedEvent';
import { ObserverReleasedEvent } from '../events/observer/ObserverReleasedEvent';
import { ObserverStartedEvent } from '../events/observer/ObserverStartedEvent';

import { createResourceGroupKey } from '../utils/ResourceGroupKey';
import { captureSourceContext } from '../utils/SourceLocationCapture';

import type { Instrumentation } from './Instrumentation';
import { InstrumentationScope } from './InstrumentationScope';

type ObserverType = 'mutation' | 'resize' | 'intersection';

interface ObserverResource {
  resourceId: ResourceIdentity;
  resourceGroupId: ResourceIdentity;
}

export class ObserverInstrumentation implements Instrumentation {
  private readonly originalMutationObserver = globalThis.MutationObserver;

  private readonly originalResizeObserver = globalThis.ResizeObserver;

  private readonly originalIntersectionObserver =
    globalThis.IntersectionObserver;

  private started = false;

  /**
   * Tracks each actual runtime Observer instance.
   *
   * Observer instance -> resource identity
   */
  private readonly observers = new Map<object, ObserverResource>();

  /**
   * Tracks logical resource groups.
   *
   * groupKey -> resourceGroupId
   *
   * The same observer type + same source location
   * gets the same resourceGroupId during the
   * current runtime session.
   */
  private readonly resourceGroups = new Map<string, ResourceIdentity>();

  constructor(
    private readonly publisher: EventPublisher,
    private readonly scope: InstrumentationScope,
  ) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const OriginalMutationObserver = this.originalMutationObserver;
    const OriginalResizeObserver = this.originalResizeObserver;
    const OriginalIntersectionObserver = this.originalIntersectionObserver;

    const publisher = this.publisher;
    const observers = this.observers;
    const resourceGroups = this.resourceGroups;
    const scope = this.scope;

    /**
     * Creates the resource identity and resource group
     * for an Observer instance.
     */
    const createObserverResource = (
      observer: object,
      observerType: ObserverType,
    ): void => {
      /**
       * Observer creation performed internally by MRI
       * must never become a tracked application resource.
       */
      if (scope.isInternal()) {
        return;
      }

      /**
       * Every actual Observer instance gets
       * a unique resourceId.
       */
      const resourceId = crypto.randomUUID() as ResourceIdentity;

      /**
       * Capture the COMPLETE source context.
       *
       * This gives us:
       *
       *   sourceLocation
       *   owner
       *
       * from the complete JavaScript stack.
       */
      const { sourceLocation, owner } = captureSourceContext();

      /**
       * If the stack does not contain a useful application
       * or framework source, do not create a developer resource.
       *
       * Runtime-only / infrastructure-only observer creation
       * should not pollute the report.
       */
      // if (owner === 'runtime') {
      //   return;
      // }

      /**
       * Same observer type + same source location
       * = same logical resource group.
       */
      const groupKey = createResourceGroupKey(
        `${observerType}-observer`,
        sourceLocation,
      );

      let resourceGroupId = resourceGroups.get(groupKey);

      if (!resourceGroupId) {
        resourceGroupId = crypto.randomUUID() as ResourceIdentity;
        resourceGroups.set(groupKey, resourceGroupId);
      }

      observers.set(observer, {
        resourceId,
        resourceGroupId,
      });

      const createdEvent: ObserverCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'ObserverCreated',
        timestamp: Date.now(),
        resourceId,
        resourceGroupId,
        owner,
        observerType,
        sourceLocation,
      };

      publisher.publish(createdEvent);
    };

    /**
     * MutationObserver
     */
    if (OriginalMutationObserver) {
      class PatchedMutationObserver extends OriginalMutationObserver {
        constructor(
          ...args: ConstructorParameters<typeof OriginalMutationObserver>
        ) {
          super(...args);

          createObserverResource(this, 'mutation');
        }

        observe(target: Node, options?: MutationObserverInit): void {
          const resource = observers.get(this);

          if (resource) {
            const startedEvent: ObserverStartedEvent = {
              id: crypto.randomUUID(),
              type: 'ObserverStarted',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
              observerType: 'mutation',
              target: target.constructor.name,
            };

            publisher.publish(startedEvent);
          }

          return super.observe(target, options);
        }

        disconnect(): void {
          const resource = observers.get(this);

          if (resource) {
            const releasedEvent: ObserverReleasedEvent = {
              id: crypto.randomUUID(),
              type: 'ObserverReleased',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
              observerType: 'mutation',
            };

            publisher.publish(releasedEvent);

            observers.delete(this);
          }

          return super.disconnect();
        }
      }

      globalThis.MutationObserver = PatchedMutationObserver;
    }

    /**
     * ResizeObserver
     */
    if (OriginalResizeObserver) {
      class PatchedResizeObserver extends OriginalResizeObserver {
        constructor(
          ...args: ConstructorParameters<typeof OriginalResizeObserver>
        ) {
          super(...args);

          createObserverResource(this, 'resize');
        }

        observe(target: Element, options?: ResizeObserverOptions): void {
          const resource = observers.get(this);

          if (resource) {
            const startedEvent: ObserverStartedEvent = {
              id: crypto.randomUUID(),
              type: 'ObserverStarted',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
              observerType: 'resize',
              target: target.constructor.name,
            };

            publisher.publish(startedEvent);
          }

          return super.observe(target, options);
        }

        disconnect(): void {
          const resource = observers.get(this);

          if (resource) {
            const releasedEvent: ObserverReleasedEvent = {
              id: crypto.randomUUID(),
              type: 'ObserverReleased',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
              observerType: 'resize',
            };

            publisher.publish(releasedEvent);

            observers.delete(this);
          }

          return super.disconnect();
        }
      }

      globalThis.ResizeObserver = PatchedResizeObserver;
    }

    /**
     * IntersectionObserver
     */
    if (OriginalIntersectionObserver) {
      class PatchedIntersectionObserver extends OriginalIntersectionObserver {
        constructor(
          ...args: ConstructorParameters<typeof OriginalIntersectionObserver>
        ) {
          super(...args);

          createObserverResource(this, 'intersection');
        }

        observe(target: Element): void {
          const resource = observers.get(this);

          if (resource) {
            const startedEvent: ObserverStartedEvent = {
              id: crypto.randomUUID(),
              type: 'ObserverStarted',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
              observerType: 'intersection',
              target: target.constructor.name,
            };

            publisher.publish(startedEvent);
          }

          return super.observe(target);
        }

        disconnect(): void {
          const resource = observers.get(this);

          if (resource) {
            const releasedEvent: ObserverReleasedEvent = {
              id: crypto.randomUUID(),
              type: 'ObserverReleased',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
              observerType: 'intersection',
            };

            publisher.publish(releasedEvent);

            observers.delete(this);
          }

          return super.disconnect();
        }
      }

      globalThis.IntersectionObserver = PatchedIntersectionObserver;
    }
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    /**
     * Restore the original runtime APIs.
     */
    globalThis.MutationObserver = this.originalMutationObserver;

    globalThis.ResizeObserver = this.originalResizeObserver;

    globalThis.IntersectionObserver = this.originalIntersectionObserver;

    /**
     * Observer instances belong to this runtime session.
     */
    this.observers.clear();

    /**
     * Logical groups also belong to this runtime session.
     */
    this.resourceGroups.clear();
  }
}
