#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isRuntimeSnapshot } from './validateSnapshot';
import { SnapshotHistory } from './SnapshotHistory';
import { Analyzer } from '../analysis';
import { ResourceLifecycleRule } from '../analysis/rules/ResourceLifecycleRule';
import { ConsoleRenderer, Presentation } from '../presentation';

async function findMemoryRuntimeDirectory(): Promise<string | null> {
  const directory = path.resolve(process.cwd(), '.memory-runtime');

  try {
    await access(directory);
    return directory;
  } catch {
    return null;
  }
}

async function findActiveSnapshot(directory: string): Promise<string | null> {
  const snapshotPath = path.join(directory, 'active.json');

  try {
    await access(snapshotPath);
    return snapshotPath;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const directory = await findMemoryRuntimeDirectory();

  if (!directory) {
    console.log('No active Memory Runtime session found.');
    return;
  }

  const snapshotPath = await findActiveSnapshot(directory);

  if (!snapshotPath) {
    console.log('No active Memory Runtime session found.');
    return;
  }

  const rawSnapshot = await readFile(snapshotPath, 'utf-8');

  let snapshot: unknown;

  try {
    snapshot = JSON.parse(rawSnapshot);
  } catch {
    console.error('✗ Invalid Memory Runtime state.');
    return;
  }

  if (!isRuntimeSnapshot(snapshot)) {
    console.error('✗ Invalid Memory Runtime state.');
    return;
  }

  const history = new SnapshotHistory(snapshot.events);

  const context = {
    resources: snapshot.resources,
    history,
  };

  const analyzer = new Analyzer([new ResourceLifecycleRule()]);

  const findings = analyzer.analyze(context);

  const presentation = new Presentation(new ConsoleRenderer());

  console.log(presentation.present(findings));

  if (findings.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
