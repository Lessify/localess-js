import type { Plugin } from 'vite';

import { VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID } from './vite-plugin-localess-components';

const VIRTUAL_MODULE_ID = 'virtual:localess-init';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export interface LocalessInitOptions {
  origin: string;
  spaceId: string;
  token: string;
  publicToken?: string;
  version?: 'draft';
  cacheTTL?: number | false;
  debug?: boolean;
  enableSync?: boolean;
}

/**
 * Builds `virtual:localess-init`, resolved differently per Vite build graph:
 * the SSR/server graph gets `localessInit()` called with the secret `token`;
 * the client graph gets it called with `publicToken` if configured, or a
 * no-op module otherwise. Both variants pass the merged component registry
 * from `virtual:localess-components`.
 *
 * `token` must stay server-side only (never shipped to the browser) — never
 * change which branch (`ssr: true` vs `false`) receives it.
 */
export function vitePluginLocalessInit(options: LocalessInitOptions): Plugin {
  const { publicToken, token, ...rest } = options;

  return {
    name: 'vite-plugin-localess-init',
    async resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    async load(id: string, loadOptions?: { ssr?: boolean }) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return;
      }

      const isSsr = loadOptions?.ssr ?? false;

      if (!isSsr && !publicToken) {
        return { code: 'export {}', moduleType: 'js' };
      }

      const initOptions = { ...rest, token: isSsr ? token : publicToken };

      return {
        code: `
          import { localessInit } from "@localess/react";
          import { localessComponents } from "${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}";
          localessInit({ ...${JSON.stringify(initOptions)}, components: localessComponents });
        `,
        moduleType: 'js',
      };
    },
  };
}
