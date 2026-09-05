import type { ComponentNamingStrategy } from '@localess/client';
import type { Plugin } from 'vite';

import { vitePluginLocalessComponents } from './vite-plugin-localess-components';

export interface LocalessOptions {
  /** Directory globbed for `.vue` components, each keyed by its filename verbatim. */
  componentsDir?: string;
  /**
   * Explicit schema-key to path overrides, relative to `componentsDir`. Suffix a
   * path with `#ExportName` for a named export. These win on key collision.
   */
  components?: Record<string, string>;
  /**
   * How a content `_schema` key is matched to a component discovered under
   * `componentsDir`.
   *
   * A discovery concern, so it lives here rather than on the `Localess` plugin:
   * filenames follow a Vue convention while schema names are chosen in Localess,
   * and only auto-discovery has to reconcile the two. The generated registry
   * resolves keys itself, so nothing is added to `localessInit()`.
   *
   * @default 'exact'
   */
  componentNaming?: ComponentNamingStrategy;
}

export function localess(options: LocalessOptions): Plugin[] {
  const { componentsDir = 'src', components = {}, componentNaming = 'exact' } = options;
  return [vitePluginLocalessComponents(componentsDir, components, componentNaming)];
}
