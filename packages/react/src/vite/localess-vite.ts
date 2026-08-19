import type { Plugin } from 'vite';

import { vitePluginLocalessComponents } from './vite-plugin-localess-components';
import { type LocalessInitOptions, vitePluginLocalessInit } from './vite-plugin-localess-init';

export interface LocalessViteOptions extends LocalessInitOptions {
  componentsDir?: string;
  components?: Record<string, string>;
}

/**
 * The `localessVite()` Vite plugin for React SSR frameworks (TanStack Start,
 * React Router v7 framework mode, Remix Vite). Add it to `vite.config.ts`'s
 * `plugins` array to replace hand-written, duplicated `localessInit()` calls
 * across your server and client module graphs.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { localessVite } from '@localess/react/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     localessVite({
 *       origin: process.env.LOCALESS_ORIGIN!,
 *       spaceId: process.env.LOCALESS_SPACE_ID!,
 *       token: process.env.LOCALESS_TOKEN!,           // secret — SSR graph only
 *       publicToken: process.env.LOCALESS_PUBLIC_TOKEN, // optional, public — client graph
 *       enableSync: true,
 *       componentsDir: 'src/components/localess',
 *     }),
 *   ],
 * });
 * ```
 */
export function localessVite(options: LocalessViteOptions): Plugin[] {
  if (!options.origin || !options.spaceId || !options.token) {
    throw new Error('[@localess/react/vite] localessVite() requires "origin", "spaceId", and "token".');
  }

  const { componentsDir = 'src', components = {}, ...initOptions } = options;

  return [vitePluginLocalessComponents(componentsDir, components), vitePluginLocalessInit(initOptions)];
}
