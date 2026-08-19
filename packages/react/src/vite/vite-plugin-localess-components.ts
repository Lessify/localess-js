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
 * `.tsx`/`.jsx` file under `componentsDir` (keyed by kebab-cased filename,
 * derived at generated-code runtime, not here), followed by manual
 * registrations — which run last, so they win on key collision.
 */
export function generateComponentsModuleCode(componentsDir: string, manualRegistrations: ManualComponentRegistration[]): string {
  const globPattern = `${normalizePath(componentsDir)}/**/*.{tsx,jsx}`;

  const importStatements = manualRegistrations.map((r, i) =>
    r.exportName
      ? `import { ${r.exportName} as __manual_component_${i}__ } from '${r.importPath}';`
      : `import __manual_component_${i}__ from '${r.importPath}';`
  );
  const manualAssignments = manualRegistrations.map((r, i) => `localessComponents[${JSON.stringify(r.key)}] = __manual_component_${i}__;`);

  return `
    ${importStatements.join('\n    ')}

    const modules = import.meta.glob('${globPattern}', { eager: true });

    function toKebabCase(str) {
      return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\\s]+/g, '-').toLowerCase();
    }

    const localessComponents = {};
    for (const filePath in modules) {
      const fileName = filePath.split('/').pop();
      const componentName = toKebabCase((fileName || '').replace(/\\.[^/.]+$/, ''));
      if (componentName) {
        const mod = modules[filePath];
        localessComponents[componentName] = mod?.default ?? mod;
      }
    }

    ${manualAssignments.join('\n    ')}

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
export function vitePluginLocalessComponents(componentsDir: string, components: Record<string, string>): Plugin {
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

      return { code: generateComponentsModuleCode(componentsDir, manualRegistrations), moduleType: 'js' };
    },
  };
}
