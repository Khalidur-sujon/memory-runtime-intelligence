/**
 * Uniquely identifies a Resource within a runtime session.
 */
export type ResourceIdentity = string;

/**
 * Describes the kind of runtime resource.
 *
 * This is intentionally open-ended to support custom adapters.
 */
export type ResourceType =
  'websocket' | 'timer' | 'event-listener' | 'timer-interval';

/**
 * Represents the lifecycle state of a Resource.
 */
export type ResourceState = 'observed' | 'released' | 'archived';

/**
 * Represents a runtime resource tracked by the system.
 */
export interface Resource {
  readonly id: ResourceIdentity;
  readonly type: ResourceType;
  state: ResourceState;
}
