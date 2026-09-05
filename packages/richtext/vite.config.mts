import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts'],
    }),
  ],
  build: {
    minify: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'test-utils/index': resolve(import.meta.dirname, 'src/test-utils/index.ts'),
        'html-parser/index': resolve(import.meta.dirname, 'src/html-parser/index.ts'),
        'markdown-parser/index': resolve(import.meta.dirname, 'src/markdown-parser/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`,
    },
  },
});
