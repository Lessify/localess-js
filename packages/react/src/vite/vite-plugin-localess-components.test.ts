import { normalizeComponentKey } from '@localess/client';
import { describe, expect, it } from 'vitest';

import {
  generateComponentsModuleCode,
  VIRTUAL_LOCALESS_COMPONENTS_MODULE_ID,
  vitePluginLocalessComponents,
} from './vite-plugin-localess-components';

/**
 * Runs the generated module body with `import.meta.glob` stubbed out, so key
 * derivation is asserted on the registry it actually produces rather than on
 * the source text. Only valid for code generated without manual registrations,
 * which emit real `import` statements.
 */
function evaluateRegistry(code: string, modules: Record<string, unknown>): Record<string, unknown> {
  const body = code
    .replace(/import\.meta\.glob\([^)]*\)/, '__modules__')
    .replace(/export \{ localessComponents \};?/, 'return localessComponents;');
  return new Function('__modules__', body)(modules) as Record<string, unknown>;
}

describe('generateComponentsModuleCode', () => {
  it('globs componentsDir recursively for .tsx and .jsx files', () => {
    const code = generateComponentsModuleCode('/src', []);

    expect(code).toContain(`import.meta.glob('/src/**/*.{tsx,jsx}'`);
    expect(code).toContain('eager: true');
    expect(code).toContain('export { localessComponents }');
  });

  it('registers each component under its filename verbatim', () => {
    const registry = evaluateRegistry(generateComponentsModuleCode('/src', []), {
      '/src/Page.tsx': { default: 'PageComponent' },
    });

    expect(registry).toEqual({ Page: 'PageComponent' });
  });

  it('keeps a kebab-case filename as-is', () => {
    const registry = evaluateRegistry(generateComponentsModuleCode('/src', []), {
      '/src/hero-banner.tsx': { default: 'HeroBanner' },
    });

    expect(registry).toEqual({ 'hero-banner': 'HeroBanner' });
  });

  it('keeps differently-cased filenames as distinct keys', () => {
    const registry = evaluateRegistry(generateComponentsModuleCode('/src', []), {
      '/src/page.tsx': { default: 'LowercasePage' },
      '/src/Page.tsx': { default: 'PascalPage' },
    });

    expect(registry).toEqual({ page: 'LowercasePage', Page: 'PascalPage' });
  });

  it('places manual registrations after the glob loop so they win on key collision', () => {
    const code = generateComponentsModuleCode('/src', [{ key: 'hero', importPath: '/src/localess/Hero.tsx' }]);

    const globLoopIndex = code.indexOf('for (const filePath in modules)');
    const manualIndex = code.indexOf(`__localessRegistry__["hero"] = __manual_component_0__;`);

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
    expect(loaded.code).toContain(`__localessRegistry__["hero"] = __manual_component_0__;`);
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

describe('componentNaming in the generated registry', () => {
  /** Executes the generated module with the glob and the naming import stubbed. */
  function evaluateWithNaming(code: string, modules: Record<string, unknown>) {
    const body = code
      .replace(/import \{ normalizeComponentKey \} from '@localess\/react';/, '')
      .replace(/import\.meta\.glob\([^)]*\)/, '__modules__')
      .replace(/export \{ localessComponents \};?/, 'return localessComponents;');
    return new Function('__modules__', 'normalizeComponentKey', body)(modules, normalizeComponentKey) as Record<string, unknown>;
  }

  const modules = { '/src/HeroBanner.tsx': { default: 'C' } };

  it('emits a plain object with no Proxy under the default exact strategy', () => {
    const code = generateComponentsModuleCode('/src', []);

    expect(code).not.toContain('Proxy');
    expect(code).not.toContain('normalizeComponentKey');
  });

  it('matches only the identical spelling under exact', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'exact'), modules);

    expect(registry['HeroBanner']).toBe('C');
    expect(registry['hero-banner']).toBeUndefined();
  });

  it('resolves any spelling under camelCase, without core involvement', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'camelCase'), modules);

    for (const schema of ['HeroBanner', 'heroBanner', 'hero-banner', 'hero_banner']) {
      expect(registry[schema]).toBe('C');
    }
  });

  it('answers Object.hasOwn, which is what core uses to probe the registry', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'kebab-case'), modules);

    expect(Object.hasOwn(registry, 'hero_banner')).toBe(true);
    expect(Object.hasOwn(registry, 'Missing')).toBe(false);
  });

  it('still misses an unregistered schema', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'lowercase'), modules);

    expect(registry['Missing']).toBeUndefined();
  });

  it('exposes normalized keys via Object.keys', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'kebab-case'), modules);

    expect(Object.keys(registry)).toEqual(['hero-banner']);
  });
});
