/// <reference types="vitest" />

import { fileURLToPath } from 'node:url';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Inside this monorepo `@localess/angular` resolves to the package source folder, whose
// built entry point lives in `dist/`. A published app installing from npm needs neither
// this alias nor the matching `paths` entry in tsconfig.json.
const localessAngular = fileURLToPath(new URL('../../packages/angular/dist', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
    alias: {
      '@localess/angular': localessAngular,
    },
  },
  // `@localess/angular` ships as an untranspiled FESM2022 bundle, so Nitro has to bundle it
  // rather than treat it as an external CommonJS dependency at SSR time.
  ssr: {
    noExternal: ['@localess/angular'],
  },
  plugins: [analog(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
}));
