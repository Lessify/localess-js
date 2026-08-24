import type { Plugin } from 'vite';

import { vitePluginLocalessComponents } from './vite-plugin-localess-components';

export interface LocalessOptions {
  componentsDir?: string;
  components?: Record<string, string>;
}

export function localess(options: LocalessOptions): Plugin[] {
  const { componentsDir = 'src', components = {} } = options;
  return [vitePluginLocalessComponents(componentsDir, components)];
}
