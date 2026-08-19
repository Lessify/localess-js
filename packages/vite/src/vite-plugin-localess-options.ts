import type { Plugin } from 'vite';

import { createVirtualModulePlugin } from './create-virtual-module-plugin';

const VIRTUAL_MODULE_ID = 'virtual:localess-options';

/**
 * Exposes an arbitrary, JSON-serializable options object as a virtual module, resolved at the
 * consumer's own Vite build time. Use for config values a consumer's server-only code needs but
 * that must not be inlined at the wrong build time — the same trick `vitePluginLocalessInit`
 * uses, generalized to any options shape.
 */
export function vitePluginLocalessOptions(options: Record<string, unknown>): Plugin {
  return createVirtualModulePlugin(
    'vite-plugin-localess-options',
    VIRTUAL_MODULE_ID,
    () => `export default ${JSON.stringify(options)}`
  );
}
