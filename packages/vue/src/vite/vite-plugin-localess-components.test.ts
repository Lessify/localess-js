import { normalizeComponentKey } from '@localess/client';
import { describe, expect, it, vi } from 'vitest';

import { generateComponentsModuleCode, vitePluginLocalessComponents } from './vite-plugin-localess-components';

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
  it('globs the components dir and exports the registry', () => {
    const code = generateComponentsModuleCode('/src/components', []);
    expect(code).toContain("import.meta.glob('/src/components/**/*.vue'");
    expect(code).toContain('export { localessComponents }');
  });

  it('registers each component under its filename verbatim', () => {
    const registry = evaluateRegistry(generateComponentsModuleCode('/src/components', []), {
      '/src/components/Page.vue': { default: 'PageComponent' },
    });

    expect(registry).toEqual({ Page: 'PageComponent' });
  });

  it('keeps a kebab-case filename as-is', () => {
    const registry = evaluateRegistry(generateComponentsModuleCode('/src/components', []), {
      '/src/components/hero-banner.vue': { default: 'HeroBanner' },
    });

    expect(registry).toEqual({ 'hero-banner': 'HeroBanner' });
  });

  it('keeps differently-cased filenames as distinct keys', () => {
    const registry = evaluateRegistry(generateComponentsModuleCode('/src/components', []), {
      '/src/components/page.vue': { default: 'LowercasePage' },
      '/src/components/Page.vue': { default: 'PascalPage' },
    });

    expect(registry).toEqual({ page: 'LowercasePage', Page: 'PascalPage' });
  });

  it('appends manual registrations after the glob, so they win on collision', () => {
    const code = generateComponentsModuleCode('/src/components', [{ key: 'hero', importPath: '/src/components/Hero.vue' }]);
    expect(code).toContain("import __manual_component_0__ from '/src/components/Hero.vue';");
    expect(code).toContain('__localessRegistry__["hero"] = __manual_component_0__;');
  });
});

describe('vitePluginLocalessComponents', () => {
  it('resolves the virtual module id', async () => {
    const plugin = vitePluginLocalessComponents('/src', {});
    const resolved = await (plugin.resolveId as any)('virtual:localess-vue-components');
    expect(resolved).toBe('\0virtual:localess-vue-components');
  });

  it('throws when a manual component path cannot be resolved', async () => {
    const plugin = vitePluginLocalessComponents('/src', { hero: '/Hero.vue' });
    const ctx = { resolve: vi.fn().mockResolvedValue(null) };
    await expect((plugin.load as any).call(ctx, '\0virtual:localess-vue-components')).rejects.toThrow(
      'Component could not be found for schema "hero"'
    );
  });
});

describe('componentNaming in the generated registry', () => {
  function evaluateWithNaming(code: string, modules: Record<string, unknown>) {
    const body = code
      .replace(/import \{ normalizeComponentKey \} from '@localess\/vue';/, '')
      .replace(/import\.meta\.glob\([^)]*\)/, '__modules__')
      .replace(/export \{ localessComponents \};?/, 'return localessComponents;');
    return new Function('__modules__', 'normalizeComponentKey', body)(modules, normalizeComponentKey) as Record<string, unknown>;
  }

  const modules = { '/src/HeroBanner.vue': { default: 'C' } };

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

  it('resolves any spelling under camelCase, with no involvement from localessInit', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'camelCase'), modules);

    for (const schema of ['HeroBanner', 'heroBanner', 'hero-banner', 'hero_banner']) {
      expect(registry[schema]).toBe('C');
    }
  });

  it('answers Object.hasOwn, which is how getComponent probes the registry', () => {
    const registry = evaluateWithNaming(generateComponentsModuleCode('/src', [], 'kebab-case'), modules);

    expect(Object.hasOwn(registry, 'hero_banner')).toBe(true);
    expect(Object.hasOwn(registry, 'Missing')).toBe(false);
  });
});
