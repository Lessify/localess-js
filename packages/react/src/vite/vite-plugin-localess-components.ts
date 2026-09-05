import type { ComponentNamingStrategy } from '@localess/client';
import type { Plugin } from 'vite';

import { normalizePath } from './utils/normalize-path';

export const VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID = 'virtual:localess-components';
const RESOLVED_VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID = `\0${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}`;

export interface ManualComponentRegistration {
  key: string;
  importPath: string;
  exportName?: string;
}

/**
 * Generates the virtual module source: a glob-based auto-registry of every
 * `.tsx`/`.jsx` file under `componentsDir`, followed by manual registrations —
 * which run last, so they win on key collision.
 *
 * Keys are the filename verbatim (`Page.tsx` -> `Page`).
 *
 * When `componentNaming` is anything other than `'exact'`, the exported registry
 * is wrapped so that it resolves keys through that strategy itself. This keeps
 * naming a concern of *this* plugin — where `componentsDir` lives and where
 * filenames are chosen — instead of leaking an option into `localessInit()`,
 * which receives a registry the consumer wrote by hand and whose keys they
 * already control. `@localess/react`'s core lookup stays a plain property
 * access either way.
 *
 * Under the default `'exact'` no wrapper is emitted at all, so the common case
 * is an ordinary object with nothing to reason about.
 */
export function generateComponentsModuleCode(
  componentsDir: string,
  manualRegistrations: ManualComponentRegistration[],
  componentNaming: ComponentNamingStrategy = 'exact'
): string {
  const globPattern = `${normalizePath(componentsDir)}/**/*.{tsx,jsx}`;

  const importStatements = manualRegistrations.map((r, i) =>
    r.exportName
      ? `import { ${r.exportName} as __manual_component_${i}__ } from '${r.importPath}';`
      : `import __manual_component_${i}__ from '${r.importPath}';`
  );
  const manualAssignments = manualRegistrations.map(
    (r, i) => `__localessRegistry__[${JSON.stringify(r.key)}] = __manual_component_${i}__;`
  );

  const exportStatement =
    componentNaming === 'exact'
      ? `const localessComponents = __localessRegistry__;`
      : `
    const __naming__ = ${JSON.stringify(componentNaming)};
    const __index__ = new Map(
      Object.entries(__localessRegistry__).map(([key, component]) => [normalizeComponentKey(key, __naming__), component])
    );
    // Resolves \`data._schema\` through the configured strategy without the core
    // package needing to know a strategy exists.
    const localessComponents = new Proxy(__localessRegistry__, {
      get: (target, key) => (typeof key === 'string' ? __index__.get(normalizeComponentKey(key, __naming__)) : target[key]),
      has: (target, key) => (typeof key === 'string' ? __index__.has(normalizeComponentKey(key, __naming__)) : key in target),
      ownKeys: () => Array.from(__index__.keys()),
      // Must be key-aware: \`Object.hasOwn\` — which is how the registry is probed —
      // goes through this trap, not \`has\`.
      getOwnPropertyDescriptor: (target, key) => {
        if (typeof key !== 'string') return Object.getOwnPropertyDescriptor(target, key);
        const normalized = normalizeComponentKey(key, __naming__);
        return __index__.has(normalized) ? { value: __index__.get(normalized), enumerable: true, configurable: true, writable: true } : undefined;
      },
    });`.trim();

  const namingImport = componentNaming === 'exact' ? '' : `import { normalizeComponentKey } from '@localess/react';`;

  return `
    ${namingImport}
    ${importStatements.join('\n    ')}

    const modules = import.meta.glob('${globPattern}', { eager: true });

    const __localessRegistry__ = {};
    for (const filePath in modules) {
      const fileName = filePath.split('/').pop();
      const baseName = (fileName || '').replace(/\\.[^/.]+$/, '');
      if (baseName) {
        const mod = modules[filePath];
        __localessRegistry__[baseName] = mod?.default ?? mod;
      }
    }

    ${manualAssignments.join('\n    ')}

    ${exportStatement}

    export { localessComponents };
  `.trim();
}

/**
 * Vite plugin exposing `virtual:localess-components`: an auto-registry of
 * every `.tsx`/`.jsx` component under `componentsDir`, merged with explicit
 * `components` overrides (schema key -> file path relative to `componentsDir`,
 * optionally suffixed with `#ExportName` for a named export — a bare path
 * assumes a default export).
 */
export function vitePluginLocalessComponents(
  componentsDir: string,
  components: Record<string, string>,
  componentNaming: ComponentNamingStrategy = 'exact'
): Plugin {
  return {
    name: 'vite-plugin-localess-components',
    async resolveId(id: string) {
      if (id === VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID) {
        return RESOLVED_VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID;
      }
    },
    async load(id: string) {
      if (id !== RESOLVED_VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID) {
        return;
      }

      const manualRegistrations: ManualComponentRegistration[] = [];
      for (const [key, rawPath] of Object.entries(components)) {
        const [relativePath, exportName] = rawPath.split('#');
        const fullPath = `${normalizePath(componentsDir)}${normalizePath(relativePath)}`;
        const resolved = await this.resolve(fullPath);
        if (!resolved) {
          throw new Error(`[@localess/react/vite] Component could not be found for schema "${key}"! Does "${fullPath}" exist?`);
        }
        manualRegistrations.push({ key, importPath: resolved.id, exportName });
      }

      return { code: generateComponentsModuleCode(componentsDir, manualRegistrations, componentNaming), moduleType: 'js' };
    },
  };
}
