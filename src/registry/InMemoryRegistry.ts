import type { Resource } from '../core';
import type { ResourceIdentity } from '../core';
import type { Registry } from './Registry';

export class InMemoryRegistry implements Registry {
  private readonly resources = new Map<ResourceIdentity, Resource>();

  register(resource: Resource): void {
    this.resources.set(resource.id, resource);
  }

  release(id: ResourceIdentity): void {
    const resource = this.resources.get(id);

    if (!resource) {
      return;
    }

    resource.state = 'released';
  }

  find(id: ResourceIdentity): Resource | undefined {
    return this.resources.get(id);
  }

  list(): readonly Resource[] {
    return Array.from(this.resources.values());
  }
}
