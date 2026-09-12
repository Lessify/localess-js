/// <reference types="vitest" />

import { fileURLToPath } from 'node:url';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { localessClient } from '@localess/client';
import { defineConfig } from 'vite';
import { LOCALES } from './src/app/shared/utils/locales';
import { LOCALESS_CONNECTION } from './src/app/shared/utils/localess-config';

// Inside this monorepo `@localess/angular` resolves to the package source folder, whose
// built entry point lives in `dist/`. A published app installing from npm needs neither
// this alias nor the matching `paths` entry in tsconfig.json.
const localessAngular = fileURLToPath(new URL('../../packages/angular/dist', import.meta.url));

/**
 * Enumerates every locale/slug combination to bake into HTML.
 *
 * This runs in the Vite config — plain Node at build time, with no Angular injector — so it
 * talks to `@localess/client` directly rather than going through `LocalessContentService`.
 */
async function prerenderRoutes(): Promise<string[]> {
  const client = localessClient(LOCALESS_CONNECTION);
  const links = await client.getLinks({ kind: 'DOCUMENT' });
  const slugs = new Set(['home', ...Object.values(links).map(link => link.fullSlug)]);

  const routes = new Set<string>();
  for (const locale of LOCALES) {
    // The bare locale root and an explicit "home" slug resolve to the same content — see
    // `resolveLocaleAndSlug` — so both are emitted.
    routes.add('/' + locale.id);
    for (const slug of slugs) {
      routes.add('/' + [locale.id, ...slug.split('/')].filter(Boolean).join('/'));
    }
  }
  return [...routes];
}

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
  // `@localess/angular` ships as an untranspiled FESM2022 bundle, so it has to be bundled
  // rather than treated as an external CommonJS dependency during prerendering.
  ssr: {
    noExternal: ['@localess/angular'],
  },
  plugins: [
    // `static: true` drops the Nitro server entirely and emits only prerendered HTML into
    // dist/analog/public. `ssr` stays on — it is what renders those pages at build time.
    analog({
      static: true,
      prerender: {
        routes: prerenderRoutes,
      },
    }),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
}));
