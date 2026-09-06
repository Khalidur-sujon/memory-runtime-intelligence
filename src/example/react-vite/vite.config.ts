import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import memoryRuntimeIntelligence from 'memory-runtime-intelligence/vite';

// const mri = memoryRuntimeIntelligence();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), memoryRuntimeIntelligence()],
});
