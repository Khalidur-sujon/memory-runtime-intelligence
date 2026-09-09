import type { ResourceIdentity } from '../core';

import type {
  EventPublisher,
  WebSocketClosedEvent,
  WebSocketCreatedEvent,
} from '../events';

import { createResourceGroupKey } from '../utils/ResourceGroupKey';
import { captureSourceContext } from '../utils/SourceLocationCapture';

import { InstrumentationScope } from './InstrumentationScope';
import type { Instrumentation } from './Instrumentation';

interface WebSocketResource {
  resourceId: ResourceIdentity;
  resourceGroupId: ResourceIdentity;
}

export class WebSocketInstrumentation implements Instrumentation {
  private readonly originalWebSocket = globalThis.WebSocket;

  private started = false;

  /**
   * Tracks each actual WebSocket instance.
   *
   * WebSocket instance -> resource identity
   */
  private readonly sockets = new Map<
    InstanceType<typeof globalThis.WebSocket>,
    WebSocketResource
  >();

  /**
   * Tracks logical resource groups.
   *
   * groupKey -> resourceGroupId
   *
   * The same source location gets the same
   * resourceGroupId during the current runtime session.
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

    const OriginalWebSocket = this.originalWebSocket;

    const publisher = this.publisher;
    const scope = this.scope;
    const sockets = this.sockets;
    const resourceGroups = this.resourceGroups;

    /**
     * --------------------------------------------------
     * Patched WebSocket
     * --------------------------------------------------
     */
    class PatchedWebSocket extends OriginalWebSocket {
      constructor(...args: ConstructorParameters<typeof OriginalWebSocket>) {
        /**
         * Runtime internal WebSocket.
         *
         * This is important for:
         *
         * runtime
         *   ↓
         * runtimeWebSocketTransport
         *   ↓
         * new WebSocket(...)
         *
         * We do not want this connection to become
         * an application resource.
         */
        if (scope.isInternal()) {
          super(...args);
          return;
        }

        /**
         * Create the real WebSocket first.
         */
        super(...args);

        /**
         * Every actual application WebSocket instance
         * gets a unique resourceId.
         */
        const resourceId = crypto.randomUUID() as ResourceIdentity;

        /**
         * Capture complete stack and determine ownership.
         *
         * IMPORTANT:
         * Ownership is no longer derived from the
         * final sourceLocation.
         */
        const { sourceLocation, owner } = captureSourceContext();

        /**
         * Same resource type + same source location
         * = same logical resource group.
         */
        const groupKey = createResourceGroupKey('websocket', sourceLocation);

        let resourceGroupId = resourceGroups.get(groupKey);

        /**
         * First WebSocket from this source:
         * create group.
         *
         * Later WebSockets from the same source:
         * reuse the group.
         */
        if (!resourceGroupId) {
          resourceGroupId = crypto.randomUUID() as ResourceIdentity;

          resourceGroups.set(groupKey, resourceGroupId);
        }

        /**
         * Track the actual WebSocket instance.
         */
        sockets.set(this, {
          resourceId,
          resourceGroupId,
        });

        /**
         * Publish creation event.
         */
        const createdEvent: WebSocketCreatedEvent = {
          id: crypto.randomUUID(),
          type: 'WebSocketCreated',
          timestamp: Date.now(),
          resourceId,
          resourceGroupId,
          url: String(args[0]),
          sourceLocation,
          owner,
        };

        publisher.publish(createdEvent);

        /**
         * --------------------------------------------------
         * Patch close()
         * --------------------------------------------------
         *
         * Detect explicit WebSocket.close().
         */
        const originalClose = this.close;

        this.close = function (...closeArgs): void {
          const resource = sockets.get(this);

          if (resource) {
            const closedEvent: WebSocketClosedEvent = {
              id: crypto.randomUUID(),
              type: 'WebSocketClosed',
              timestamp: Date.now(),
              resourceId: resource.resourceId,
              resourceGroupId: resource.resourceGroupId,
            };

            publisher.publish(closedEvent);

            sockets.delete(this);
          }

          /**
           * Preserve native close behavior.
           */
          return originalClose.apply(this, closeArgs);
        };
      }
    }

    /**
     * Replace global WebSocket with
     * our instrumented implementation.
     */
    globalThis.WebSocket = PatchedWebSocket;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    /**
     * Restore the original browser WebSocket.
     */
    globalThis.WebSocket = this.originalWebSocket;

    /**
     * WebSocket instances belong to this
     * runtime session.
     */
    this.sockets.clear();

    /**
     * Logical groups also belong to this
     * runtime session.
     */
    this.resourceGroups.clear();
  }
}
