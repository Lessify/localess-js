import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/vite/index.ts'),
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'vite/index.mjs' : 'vite/index.js'),
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['vite'],
    },
  },
});
