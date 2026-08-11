import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { Plugin } from 'vite';

import { normalizeAstroExtension } from '../utils/normalize-astro-extension';
import { normalizePath } from '../utils/normalize-path';
import { toCamelCase } from '../utils/to-camel-case';

const VIRTUAL_MODULE_ID = 'virtual:import-localess-components';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export interface ComponentRegistrationParts {
  importStatement: string;
  wrapperDefinition: string;
  registrationCall: string;
}

/**
 * Vite plugin that auto-imports Localess components from `<componentsDir>/localess/**\/*.astro`
 * and merges them with an explicit `components` map, matching `@storyblok/astro`'s
 * `vite-plugin-import-storyblok-components` architecture.
 */
export function vitePluginImportLocalessComponents(
  components: Record<string, AstroComponentFactory>,
  componentsDir: string,
  enableFallbackComponent: boolean,
  customFallbackComponent?: string
): Plugin {
  return {
    name: 'vite-plugin-import-localess-components',

    async resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },

    async load(id: string) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return;
      }

      const fallbackRegistration = await resolveFallbackComponent(this, componentsDir, enableFallbackComponent, customFallbackComponent);
      const manualRegistrations = await resolveUserComponents(this, components, componentsDir, enableFallbackComponent);

      return {
        code: generateModuleCode(componentsDir, fallbackRegistration, manualRegistrations),
        moduleType: 'js',
      };
    },
  };
}

/**
 * Generates the virtual module source: static imports up top (for hoisting),
 * glob-imported components from the `localess` convention folder, then manual
 * and fallback registrations.
 */
export function generateModuleCode(
  componentsDir: string,
  fallbackRegistration: ComponentRegistrationParts | null,
  manualRegistrations: ComponentRegistrationParts[]
): string {
  const normalizedComponentsDir = normalizePath(componentsDir);
  const globPattern = `${normalizedComponentsDir}/localess/**/*.astro`;

  const allRegistrations = [...manualRegistrations];
  if (fallbackRegistration) {
    allRegistrations.push(fallbackRegistration);
  }

  const importStatements = allRegistrations.map(r => r.importStatement);
  const wrapperDefinitions = allRegistrations.map(r => r.wrapperDefinition);
  const registrationCalls = allRegistrations.map(r => r.registrationCall);

  return `
    import { toCamelCase } from '@localess/astro';
    ${importStatements.join('\n    ')}

    const modules = import.meta.glob('${globPattern}', { eager: true });

    const localessComponents = {};
    const createComponentLoader = (module) => {
      return async () => module?.default ?? module;
    };
    const registerComponent = (name, component) => {
      Object.defineProperty(localessComponents, name, {
        enumerable: true,
        configurable: true,
        get: () => createComponentLoader(component),
      });
    };

    for (const filePath in modules) {
      const fileName = filePath.split('/').pop();
      const componentName = toCamelCase(fileName?.replace(/\\.[^/.]+$/, '') ?? '');
      if (componentName) {
        registerComponent(componentName, modules[filePath]);
      }
    }

    ${wrapperDefinitions.join('\n    ')}

    ${registrationCalls.join('\n    ')}

    export { localessComponents };
  `.trim();
}

async function resolveFallbackComponent(
  ctx: any,
  componentsDir: string,
  enableFallbackComponent: boolean,
  customFallbackComponent?: string
): Promise<ComponentRegistrationParts | null> {
  if (!enableFallbackComponent) {
    return null;
  }
  if (!customFallbackComponent) {
    return createComponentRegistrationParts({
      componentName: 'FallbackComponent',
      importPath: '@localess/astro/FallbackComponent.astro',
    });
  }

  const componentPath = getComponentFullPath(componentsDir, customFallbackComponent);
  const resolved = await ctx.resolve(componentPath);
  if (!resolved) {
    throw new Error(`Custom fallback component could not be found. Does "${componentPath}" exist?`);
  }

  return createComponentRegistrationParts({ componentName: 'FallbackComponent', importPath: resolved.id });
}

async function resolveUserComponents(
  ctx: any,
  components: Record<string, AstroComponentFactory>,
  componentsDir: string,
  enableFallback: boolean
): Promise<ComponentRegistrationParts[]> {
  const resolvedComponents: ComponentRegistrationParts[] = [];

  for (const [schemaKey, componentPath] of Object.entries(components)) {
    const fullPath = getComponentFullPath(componentsDir, componentPath as unknown as string);
    const resolved = await ctx.resolve(fullPath);

    if (!resolved) {
      if (!enableFallback) {
        throw new Error(`Component could not be found for schema "${schemaKey}"! Does "${fullPath}" exist?`);
      }
      continue;
    }
    resolvedComponents.push(createComponentRegistrationParts({ componentName: toCamelCase(schemaKey), importPath: resolved.id }));
  }
  return resolvedComponents;
}

function getComponentFullPath(componentsDir: string, componentPath: string): string {
  const normalizedComponentsDir = normalizePath(componentsDir);
  const fullComponentPath = `${normalizedComponentsDir}${normalizePath(componentPath)}`;
  return normalizeAstroExtension(fullComponentPath);
}

export interface CreateComponentRegistrationPartsOptions {
  componentName: string;
  importPath: string;
}

/**
 * Generates structured registration parts for a component. Uses a getter-wrapper
 * (`{ get default() { return X } }`) rather than a direct reference, because Vite's
 * ESM bundling of many cross-referencing components can otherwise throw "cannot
 * access X before initialization" (temporal dead zone).
 */
export function createComponentRegistrationParts({
  componentName,
  importPath,
}: CreateComponentRegistrationPartsOptions): ComponentRegistrationParts {
  const varName = `__${componentName}_component__`;
  const wrapperName = `__${componentName}_wrapper__`;

  return {
    importStatement: `import ${varName} from '${importPath}';`,
    wrapperDefinition: `const ${wrapperName} = { get default() { return ${varName}; } };`,
    registrationCall: `registerComponent('${componentName}', ${wrapperName});`,
  };
}
