import type { ComponentNamingStrategy } from '@localess/client';
import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:localess-vue-components';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export interface ManualComponentRegistration {
  key: string;
  importPath: string;
  exportName?: string;
}

function normalizePath(p: string): string {
  return `/${p
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/')}`;
}

/**
 * Generates the virtual module source: a glob-based auto-registry of every
 * `.vue` file under `componentsDir`, keyed by filename verbatim
 * (`Page.vue` -> `Page`), followed by manual registrations which win on
 * collision.
 *
 * When `componentNaming` is anything other than `'exact'`, the exported registry
 * resolves keys through that strategy itself. Naming is a *discovery* concern —
 * it exists to reconcile filenames with schema names — so it belongs to this
 * plugin, next to `componentsDir`, rather than to `localessInit()`, which
 * receives a registry whose keys the consumer already chose. `getComponent`
 * stays a plain property access either way.
 *
 * Under the default `'exact'` no wrapper is emitted at all.
 */
export function generateComponentsModuleCode(
  componentsDir: string,
  manualRegistrations: ManualComponentRegistration[],
  componentNaming: ComponentNamingStrategy = 'exact'
): string {
  const globPattern = `${normalizePath(componentsDir)}/**/*.vue`;

  const importStatements = manualRegistrations.map((r, i) =>
    r.exportName
      ? `import { ${r.exportName} as __manual_component_${i}__ } from '${r.importPath}';`
      : `import __manual_component_${i}__ from '${r.importPath}';`
  );
  const manualAssignments = manualRegistrations.map(
    (r, i) => `__localessRegistry__[${JSON.stringify(r.key)}] = __manual_component_${i}__;`
  );

  const namingImport = componentNaming === 'exact' ? '' : `import { normalizeComponentKey } from '@localess/vue';`;

  const exportStatement =
    componentNaming === 'exact'
      ? `const localessComponents = __localessRegistry__;`
      : `
    const __naming__ = ${JSON.stringify(componentNaming)};
    const __index__ = new Map(
      Object.entries(__localessRegistry__).map(([key, component]) => [normalizeComponentKey(key, __naming__), component])
    );
    const localessComponents = new Proxy(__localessRegistry__, {
      get: (target, key) => (typeof key === 'string' ? __index__.get(normalizeComponentKey(key, __naming__)) : target[key]),
      has: (target, key) => (typeof key === 'string' ? __index__.has(normalizeComponentKey(key, __naming__)) : key in target),
      ownKeys: () => Array.from(__index__.keys()),
      // Key-aware because \`Object.hasOwn\` — how the registry is probed — consults
      // this trap rather than \`has\`.
      getOwnPropertyDescriptor: (target, key) => {
        if (typeof key !== 'string') return Object.getOwnPropertyDescriptor(target, key);
        const normalized = normalizeComponentKey(key, __naming__);
        return __index__.has(normalized) ? { value: __index__.get(normalized), enumerable: true, configurable: true, writable: true } : undefined;
      },
    });`.trim();

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

export function vitePluginLocalessComponents(
  componentsDir: string,
  components: Record<string, string>,
  componentNaming: ComponentNamingStrategy = 'exact'
): Plugin {
  return {
    name: 'vite-plugin-localess-vue-components',
    async resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    async load(id: string) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return;
      }

      const manualRegistrations: ManualComponentRegistration[] = [];
      for (const [key, rawPath] of Object.entries(components)) {
        const [relativePath, exportName] = rawPath.split('#');
        const fullPath = `${normalizePath(componentsDir)}${normalizePath(relativePath)}`;
        const resolved = await this.resolve(fullPath);
        if (!resolved) {
          throw new Error(`Component could not be found for schema "${key}"! Does "${fullPath}" exist?`);
        }
        manualRegistrations.push({ key, importPath: resolved.id, exportName });
      }

      return { code: generateComponentsModuleCode(componentsDir, manualRegistrations, componentNaming), moduleType: 'js' };
    },
  };
}

export { VIRTUAL_MODULE_ID as VIRTUAL_LOCALESS_VUE_COMPONENTS_MODULE_ID };
