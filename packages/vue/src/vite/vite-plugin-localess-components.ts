import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:localess-vue-components';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export interface ManualComponentRegistration {
  key: string;
  importPath: string;
  exportName?: string;
}

function normalizePath(p: string): string {
  return `/${p.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/{2,}/g, '/')}`;
}

export function generateComponentsModuleCode(componentsDir: string, manualRegistrations: ManualComponentRegistration[]): string {
  const globPattern = `${normalizePath(componentsDir)}/**/*.vue`;

  const importStatements = manualRegistrations.map((r, i) =>
    r.exportName
      ? `import { ${r.exportName} as __manual_component_${i}__ } from '${r.importPath}';`
      : `import __manual_component_${i}__ from '${r.importPath}';`
  );
  const manualAssignments = manualRegistrations.map(
    (r, i) => `localessComponents[${JSON.stringify(r.key)}] = __manual_component_${i}__;`
  );

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

export function vitePluginLocalessComponents(componentsDir: string, components: Record<string, string>): Plugin {
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

      return { code: generateComponentsModuleCode(componentsDir, manualRegistrations), moduleType: 'js' };
    },
  };
}

export { VIRTUAL_MODULE_ID as VIRTUAL_LOCALESS_VUE_COMPONENTS_MODULE_ID };
