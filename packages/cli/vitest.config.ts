import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// All @orval/* packages use a non-standard "development" export condition that vite
// picks up in dev mode, resolving to TypeScript source files that can't be executed.
const ORVAL_PACKAGES = ['core', 'angular', 'axios', 'fetch', 'hono', 'mcp', 'mock', 'query', 'solid-start', 'swr', 'zod'];

export default defineConfig({
  resolve: {
    alias: {
      // Point directly to the built dist files to bypass the exports field entirely.
      orval: resolve(__dirname, '../../node_modules/orval/dist/index.mjs'),
      ...Object.fromEntries(
        ORVAL_PACKAGES.map((pkg) => [
          `@orval/${pkg}`,
          resolve(__dirname, `../../node_modules/@orval/${pkg}/dist/index.mjs`),
        ])
      ),
    },
  },
  ssr: {
    // Process orval packages as project code (not externals) so that the aliases
    // above apply to their transitive imports as well.
    noExternal: ['orval', ...ORVAL_PACKAGES.map((pkg) => `@orval/${pkg}`)],
  },
});
