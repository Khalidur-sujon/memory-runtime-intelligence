import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
    collector: 'src/collector/index.ts',
  },

  format: ['esm', 'cjs'],

  dts: true,

  sourcemap: true,

  clean: true,

  splitting: false,

  minify: false,

  treeshake: true,

  outDir: 'dist',
});
