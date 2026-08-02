import { InMemoryRegistry } from '../registry';

import { Analyzer, UnreleasedResourceRule } from '../analysis';

import { ConsoleRenderer } from '../presentation';
import { Pipeline } from '../execution/Pipeline';

// Create registry
const registry = new InMemoryRegistry();

// Create analyzer
const analyzer = new Analyzer([new UnreleasedResourceRule()]);

// Create renderer
const renderer = new ConsoleRenderer();

// Create pipeline
const pipeline = new Pipeline(registry, analyzer, renderer);

// Execute
const output = pipeline.run();

console.log(output);
