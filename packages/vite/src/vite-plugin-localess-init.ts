import type { LocalessClientOptions } from '@localess/client';
import type { Plugin } from 'vite';

import { createVirtualModulePlugin } from './create-virtual-module-plugin';

const VIRTUAL_MODULE_ID = 'virtual:localess-init';

/**
 * Builds the server-only `LocalessClient` from the integration's config-time options.
 *
 * The resulting module must only ever be injected into a script stage that runs server-side
 * only and is never bundled into client-shipped JS (e.g. Astro's `page-ssr` stage, never
 * `page`). `token` is a secret (`@localess/client` is server-side only) — injecting this module
 * into a client-reachable stage would ship it to the browser.
 */
export function vitePluginLocalessInit(clientOptions: LocalessClientOptions): Plugin {
  return createVirtualModulePlugin(
    'vite-plugin-localess-init',
    VIRTUAL_MODULE_ID,
    () => `
      import { localessClient } from "@localess/client";
      const localessClientInstance = localessClient(${JSON.stringify(clientOptions)});
      globalThis.localessClientInstance = localessClientInstance;
      export { localessClientInstance };
    `
  );
}
