import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:localess-options';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

/**
 * Exposes the integration's resolved options (e.g. `componentsDir`) to `.astro`
 * components for error messages. Never include anything that must not reach a
 * browser bundle here beyond what a `.astro` frontmatter (server-only) already
 * keeps server-side — this module is not injected into any client script.
 */
export function vitePluginLocalessOptions(options: Record<string, unknown>): Plugin {
  return {
    name: 'vite-plugin-localess-options',
    async resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    async load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return { code: `export default ${JSON.stringify(options)}`, moduleType: 'js' };
      }
    },
  };
}
