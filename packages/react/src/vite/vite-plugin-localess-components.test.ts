import { describe, expect, it } from 'vitest';

import {
  generateComponentsModuleCode,
  VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID,
  vitePluginLocalessComponents,
} from './vite-plugin-localess-components';

describe('generateComponentsModuleCode', () => {
  it('globs componentsDir recursively for .tsx and .jsx files', () => {
    const code = generateComponentsModuleCode('/src', []);

    expect(code).toContain(`import.meta.glob('/src/**/*.{tsx,jsx}'`);
    expect(code).toContain('eager: true');
    expect(code).toContain('export { localessComponents }');
  });

  it('derives the registration key by kebab-casing the filename at runtime', () => {
    const code = generateComponentsModuleCode('/src', []);

    expect(code).toContain('function toKebabCase(str)');
    expect(code).toContain('localessComponents[componentName] = mod?.default ?? mod;');
  });

  it('places manual registrations after the glob loop so they win on key collision', () => {
    const code = generateComponentsModuleCode('/src', [{ key: 'hero', importPath: '/src/localess/Hero.tsx' }]);

    const globLoopIndex = code.indexOf('for (const filePath in modules)');
    const manualIndex = code.indexOf(`localessComponents["hero"] = __manual_component_0__;`);

    expect(globLoopIndex).toBeGreaterThan(-1);
    expect(manualIndex).toBeGreaterThan(globLoopIndex);
  });

  it('generates one import statement per manual registration, in order', () => {
    const code = generateComponentsModuleCode('/src', [
      { key: 'hero', importPath: '/src/localess/Hero.tsx' },
      { key: 'footer', importPath: '/src/localess/Footer.tsx' },
    ]);

    expect(code).toContain(`import __manual_component_0__ from '/src/localess/Hero.tsx';`);
    expect(code).toContain(`import __manual_component_1__ from '/src/localess/Footer.tsx';`);
  });

  it('generates a named import when exportName is set', () => {
    const code = generateComponentsModuleCode('/src', [{ key: 'page', importPath: '/src/localess/page.tsx', exportName: 'PageLocaless' }]);

    expect(code).toContain(`import { PageLocaless as __manual_component_0__ } from '/src/localess/page.tsx';`);
    expect(code).not.toContain(`import __manual_component_0__ from`);
  });
});

describe('vitePluginLocalessComponents', () => {
  it('resolves the virtual module id', async () => {
    const plugin = vitePluginLocalessComponents('/src', {});
    const resolved = await (plugin.resolveId as any)(VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID);

    expect(resolved).toBe(`\0${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}`);
  });

  it('resolves each manual component path against componentsDir and includes it in the generated code', async () => {
    const plugin = vitePluginLocalessComponents('/src', { hero: '/localess/Hero.tsx' });
    const ctx = { resolve: async (id: string) => ({ id }) };
    const loaded = await (plugin.load as any).call(ctx, `\0${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}`);

    expect(loaded.code).toContain(`import __manual_component_0__ from '/src/localess/Hero.tsx';`);
    expect(loaded.code).toContain(`localessComponents["hero"] = __manual_component_0__;`);
  });

  it('splits a "#ExportName" suffix off the path before resolving, and uses it as the named export', async () => {
    const plugin = vitePluginLocalessComponents('/src', { page: '/localess/page.tsx#PageLocaless' });
    const ctx = { resolve: async (id: string) => ({ id }) };
    const loaded = await (plugin.load as any).call(ctx, `\0${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}`);

    expect(loaded.code).toContain(`import { PageLocaless as __manual_component_0__ } from '/src/localess/page.tsx';`);
  });

  it('throws when a manual component path cannot be resolved', async () => {
    const plugin = vitePluginLocalessComponents('/src', { hero: '/localess/Missing.tsx' });
    const ctx = { resolve: async () => null };

    await expect((plugin.load as any).call(ctx, `\0${VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID}`)).rejects.toThrow(
      'Component could not be found for schema "hero"'
    );
  });
});
