import { Resource, ResourceIdentity } from '../core';

export interface Registry {
  register(resource: Resource): void;

  release(id: ResourceIdentity): void;

  find(id: ResourceIdentity): Resource | undefined;

  list(): readonly Resource[];
}
