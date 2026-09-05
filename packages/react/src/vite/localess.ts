import type { ComponentNamingStrategy } from '@localess/client';
import type { Plugin } from 'vite';

import { vitePluginLocalessComponents } from './vite-plugin-localess-components';
import { type LocalessInitOptions, vitePluginLocalessInit } from './vite-plugin-localess-init';

export interface LocalessOptions extends LocalessInitOptions {
  /**
   * Directory globbed for `.tsx`/`.jsx` components, each registered under its
   * filename verbatim.
   *
   * @default 'src'
   */
  componentsDir?: string;
  /**
   * Explicit schema-key to path overrides, relative to `componentsDir`. Suffix
   * a path with `#ExportName` for a named export. These win on key collision.
   */
  components?: Record<string, string>;
  /**
   * How a content `_schema` key is matched to a component discovered under
   * `componentsDir`.
   *
   * This is a discovery concern, so it lives here rather than on
   * `localessInit()`: filenames follow a React convention while schema names are
   * chosen in Localess, and only auto-discovery has to reconcile the two. The
   * generated registry resolves keys itself, so nothing is added to the core
   * API — a hand-written `components` map keeps plain exact matching.
   *
   * @default 'exact'
   */
  componentNaming?: ComponentNamingStrategy;
}

/**
 * The `localess()` Vite plugin for React SSR frameworks (TanStack Start,
 * React Router v7 framework mode, Remix Vite). Add it to `vite.config.ts`'s
 * `plugins` array to replace hand-written, duplicated `localessInit()` calls
 * across your server and client module graphs.
 *
 * KNOWN GAP: `token` is currently shipped to the browser bundle as well as
 * the SSR graph — see the warning on {@link vitePluginLocalessInit}. Treat
 * `token` as public until a scoped/public-token mechanism replaces this.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { localess } from '@localess/react/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     localess({
 *       origin: process.env.LOCALESS_ORIGIN!,
 *       spaceId: process.env.LOCALESS_SPACE_ID!,
 *       token: process.env.LOCALESS_TOKEN!, // shipped to SSR graph AND the browser bundle
 *       enableSync: true,
 *       componentsDir: 'src/components/localess',
 *     }),
 *   ],
 * });
 * ```
 */
export function localess(options: LocalessOptions): Plugin[] {
  if (!options.origin || !options.spaceId || !options.token) {
    throw new Error('[@localess/react/vite] localess() requires "origin", "spaceId", and "token".');
  }

  const { componentsDir = 'src', components = {}, componentNaming = 'exact', ...initOptions } = options;

  return [vitePluginLocalessComponents(componentsDir, components, componentNaming), vitePluginLocalessInit(initOptions)];
}
