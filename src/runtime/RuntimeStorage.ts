import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import path from 'node:path';

import type { PersistedRuntimeSnapshot } from './RuntimeSnapshot';

export class RuntimeStorage {
  private readonly directoryPath: string;

  private readonly snapshotPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.directoryPath = path.join(projectRoot, '.memory-runtime');

    this.snapshotPath = path.join(this.directoryPath, 'active.json');
  }

  async ensureDirectory(): Promise<void> {
    await mkdir(this.directoryPath, {
      recursive: true,
    });
  }

  async writeSnapshot(snapshot: PersistedRuntimeSnapshot): Promise<void> {
    await this.ensureDirectory();

    await writeFile(
      this.snapshotPath,
      JSON.stringify(snapshot, null, 2),
      'utf8',
    );
  }

  async readSnapshot(): Promise<PersistedRuntimeSnapshot | null> {
    try {
      const content = await readFile(this.snapshotPath, 'utf8');

      if (!content.trim()) {
        return null;
      }

      return JSON.parse(content) as PersistedRuntimeSnapshot;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }

      throw error;
    }
  }

  async clearSnapshot(): Promise<void> {
    await this.ensureDirectory();

    await writeFile(this.snapshotPath, '', 'utf8');
  }

  async removeDirectory(): Promise<void> {
    await rm(this.directoryPath, {
      recursive: true,
      force: true,
    });
  }
}
