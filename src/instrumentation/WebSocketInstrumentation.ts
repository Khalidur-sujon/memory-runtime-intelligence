import type { ResourceIdentity } from '../core';
import type {
  EventPublisher,
  WebSocketClosedEvent,
  WebSocketCreatedEvent,
} from '../events';
import { captureSourceLocation } from '../utils/SourceLocationCapture';
import type { Instrumentation } from './Instrumentation';

interface WebSocketResource {
  resourceId: ResourceIdentity;
  resourceGroupId: ResourceIdentity;
}

export class WebSocketInstrumentation implements Instrumentation {
  private readonly originalWebSocket = globalThis.WebSocket;
  private started = false;

  /**
   * Tracks each actual runtime WebSocket instance.
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
   * The same source location gets the same resourceGroupId
   * during the current runtime session.
   */
  private readonly resourceGroups = new Map<string, ResourceIdentity>();

  constructor(private readonly publisher: EventPublisher) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const OriginalWebSocket = this.originalWebSocket;
    const publisher = this.publisher;
    const sockets = this.sockets;
    const resourceGroups = this.resourceGroups;

    class PatchedWebSocket extends OriginalWebSocket {
      constructor(...args: ConstructorParameters<typeof OriginalWebSocket>) {
        super(...args);

        /**
         * Every actual WebSocket instance gets
         * a unique resourceId.
         */
        const resourceId = crypto.randomUUID() as ResourceIdentity;

        /**
         * Capture the creation location once.
         *
         * This location is also used to determine
         * the logical resource group.
         */
        const sourceLocation = captureSourceLocation();

        /**
         * Same resource type + same source location
         * = same logical resource group.
         */
        const groupKey = createGroupKey(sourceLocation);

        let resourceGroupId = resourceGroups.get(groupKey);

        /**
         * First WebSocket created from this location:
         * create a new logical group.
         *
         * Later WebSockets from the same location:
         * reuse the existing group id.
         */

        if (!resourceGroupId) {
          resourceGroupId = crypto.randomUUID() as ResourceIdentity;

          resourceGroups.set(groupKey, resourceGroupId);
        }

        sockets.set(this, {
          resourceId,
          resourceGroupId,
        });

        const createdEvent: WebSocketCreatedEvent = {
          id: crypto.randomUUID(),
          type: 'WebSocketCreated',
          timestamp: Date.now(),
          resourceId,
          resourceGroupId,
          url: args[0].toString(),

          sourceLocation: captureSourceLocation(),
        };

        publisher.publish(createdEvent);

        const originalClose = this.close;

        this.close = function (...closeArgs) {
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

          return originalClose.apply(this, closeArgs);
        };
      }
    }

    globalThis.WebSocket = PatchedWebSocket;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    globalThis.WebSocket = this.originalWebSocket;

    /**
     * WebSocket instances belong to this runtime session.
     */
    this.sockets.clear();

    /**
     * Logical groups also belong to this runtime session.
     */
    this.resourceGroups.clear();
  }
}

function createGroupKey(
  sourceLocation: ReturnType<typeof captureSourceLocation>,
): string {
  return `websocket:${JSON.stringify(sourceLocation)}`;
}
