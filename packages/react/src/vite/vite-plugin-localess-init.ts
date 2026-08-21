import type { Plugin } from 'vite';

import { VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID } from './vite-plugin-localess-components';

const VIRTUAL_MODULE_ID = 'virtual:localess-init';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export interface LocalessInitOptions {
  origin: string;
  spaceId: string;
  token: string;
  version?: 'draft';
  cacheTTL?: number | false;
  debug?: boolean;
  enableSync?: boolean;
}

/**
 * Builds `virtual:localess-init`, calling `localessInit()` with the merged
 * component registry from `virtual:localess-components`, identically on
 * every Vite build graph (SSR and client alike).
 *
 * KNOWN GAP (tracked, not yet fixed): this ships the secret `token` to the
 * browser bundle unconditionally, on both the SSR and client graphs.
 * `@localess/client`/`@localess/react` are documented as server-side only
 * precisely because a secret token must never reach client-side code (see
 * `docs/decisions/001-server-side-only.md`). This plugin is a deliberate,
 * temporary exception to that rule — do not copy this pattern into
 * `@localess/astro` or `@localess/angular`, which remain secret-only. A
 * public/scoped-token mechanism should replace this before recommending
 * `enableSync` (or any client-facing use of this plugin) for production
 * deployments.
 */
export function vitePluginLocalessInit(options: LocalessInitOptions): Plugin {
  return {
    name: 'vite-plugin-localess-init',
    async resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    async load(id: string) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return;
      }

      return {
        code: `
          import { localessInit } from "@localess/react";
          import { localessComponents } from "${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}";
          localessInit({ ...${JSON.stringify(options)}, components: localessComponents });
        `,
        moduleType: 'js',
      };
    },
  };
}
