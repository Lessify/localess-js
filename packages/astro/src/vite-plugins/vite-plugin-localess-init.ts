import type { LocalessClientOptions } from '@localess/client';
import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:localess-init';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

/**
 * Builds the server-only `LocalessClient` from the integration's config-time options.
 *
 * This module must only ever be injected via Astro's `page-ssr` script stage (never `page`) —
 * `page-ssr` scripts run during server rendering and are never bundled into client-shipped JS.
 * `token` is a secret (`@localess/client` is server-side only, per ADR 001); injecting this
 * module via `page` would ship it to the browser.
 *
 * The generated code imports `localessClient` from `@localess/astro` (re-exported in
 * `src/index.ts`), never from `@localess/client` directly — this code is injected into the
 * *consumer's* project, and consumer-facing code must only ever reach `@localess/astro`
 * (see `CONTRIBUTING.md`). Importing `@localess/client` here would leak our implementation
 * dependency into the consumer's module graph, which may not resolve it at all under strict
 * (non-hoisting) package managers since the consumer never installed it directly.
 */
export function vitePluginLocalessInit(clientOptions: LocalessClientOptions): Plugin {
  return {
    name: 'vite-plugin-localess-init',
    async resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    async load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return {
          code: `
            import { localessClient } from "@localess/astro";
            const localessClientInstance = localessClient(${JSON.stringify(clientOptions)});
            globalThis.localessClientInstance = localessClientInstance;
            export { localessClientInstance };
          `,
          moduleType: 'js',
        };
      }
    },
  };
}
