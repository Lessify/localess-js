import { describe, expect, it, vi } from 'vitest';

import {
  createComponentRegistrationParts,
  generateModuleCode,
  resolveFallbackComponent,
  resolveUserComponents,
  vitePluginImportLocalessComponents,
} from './vite-plugin-import-localess-components';

describe('vite-plugin-import-localess-components', () => {
  describe('createComponentRegistrationParts', () => {
    it('generates structured parts with a getter wrapper for TDZ avoidance', () => {
      const parts = createComponentRegistrationParts({
        componentName: 'hero',
        importPath: '/src/localess/Hero.astro',
      });

      expect(parts.importStatement).toBe(`import __hero_component__ from '/src/localess/Hero.astro';`);
      expect(parts.wrapperDefinition).toBe(`const __hero_wrapper__ = { get default() { return __hero_component__; } };`);
      expect(parts.registrationCall).toBe(`registerComponent("hero", __hero_wrapper__);`);
    });
  });

  describe('generateModuleCode', () => {
    it('globs componentsDir recursively for auto-discovery', () => {
      const code = generateModuleCode('/src', null, []);

      expect(code).toContain(`import.meta.glob('/src/**/*.astro'`);
      expect(code).toContain('eager: true');
      expect(code).toContain('import { normalizeComponentKey }');
      expect(code).toContain('export { localessComponents }');
    });

    it('registers glob components before manual components', () => {
      const manual = [createComponentRegistrationParts({ componentName: 'hero', importPath: '/src/localess/Hero.astro' })];
      const code = generateModuleCode('/src', null, manual);

      const globLoopIndex = code.indexOf('for (const filePath in modules)');
      const manualRegisterIndex = code.indexOf(`registerComponent("hero"`);

      expect(globLoopIndex).toBeGreaterThan(-1);
      expect(manualRegisterIndex).toBeGreaterThan(globLoopIndex);
    });

    it('includes the fallback registration last when provided', () => {
      const fallback = createComponentRegistrationParts({
        componentName: 'FallbackComponent',
        importPath: '@localess/astro/FallbackComponent.astro',
      });
      const manual = [createComponentRegistrationParts({ componentName: 'hero', importPath: '/src/localess/Hero.astro' })];
      const code = generateModuleCode('/src', fallback, manual);

      const heroIndex = code.indexOf(`registerComponent("hero"`);
      const fallbackIndex = code.indexOf(`registerComponent("FallbackComponent"`);

      expect(heroIndex).toBeGreaterThan(-1);
      expect(fallbackIndex).toBeGreaterThan(heroIndex);
    });

    it('registers with the wrapper, never the raw component reference (TDZ fix)', () => {
      const manual = [createComponentRegistrationParts({ componentName: 'hero', importPath: '/src/localess/Hero.astro' })];
      const code = generateModuleCode('/src', null, manual);

      expect(code).not.toContain(`registerComponent("hero", __hero_component__)`);
      expect(code).toContain(`registerComponent("hero", __hero_wrapper__)`);
    });
  });

  describe('resolveFallbackComponent', () => {
    it('returns null when the fallback is disabled', async () => {
      const ctx = { resolve: vi.fn() };
      const result = await resolveFallbackComponent(ctx, '/src', false);
      expect(result).toBeNull();
      expect(ctx.resolve).not.toHaveBeenCalled();
    });

    it('uses the built-in FallbackComponent without resolving when no custom one is given', async () => {
      const ctx = { resolve: vi.fn() };
      const result = await resolveFallbackComponent(ctx, '/src', true);
      expect(result?.importStatement).toContain('@localess/astro/FallbackComponent.astro');
      expect(ctx.resolve).not.toHaveBeenCalled();
    });

    it('resolves a custom fallback component through the plugin context', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/resolved/Custom.astro' }) };
      const result = await resolveFallbackComponent(ctx, '/src', true, 'Custom.astro');
      expect(ctx.resolve).toHaveBeenCalledWith('/src/Custom.astro');
      expect(result?.importStatement).toContain('/resolved/Custom.astro');
    });

    it('throws when the custom fallback component cannot be resolved', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue(undefined) };
      await expect(resolveFallbackComponent(ctx, '/src', true, 'Missing.astro')).rejects.toThrow(
        /Custom fallback component could not be found/
      );
    });
  });

  describe('resolveUserComponents', () => {
    it('returns an empty array and resolves nothing for an empty components map', async () => {
      const ctx = { resolve: vi.fn() };
      const result = await resolveUserComponents(ctx, {}, '/src', false);
      expect(result).toEqual([]);
      expect(ctx.resolve).not.toHaveBeenCalled();
    });

    it('keeps the schema key verbatim under the default exact strategy', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/resolved/Hero.astro' }) };
      const result = await resolveUserComponents(ctx, { HeroBlock: 'Hero.astro' } as any, '/src', false);
      expect(result[0].registrationCall).toContain(`registerComponent("HeroBlock"`);
      expect(result[0].importStatement).toContain('/resolved/Hero.astro');
    });

    it('normalizes the schema key under a configured strategy', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/resolved/Hero.astro' }) };
      const result = await resolveUserComponents(ctx, { HeroBlock: 'Hero.astro' } as any, '/src', false, 'camelCase');
      expect(result[0].registrationCall).toContain(`registerComponent("heroBlock"`);
    });

    it('emits a valid identifier for a kebab-case schema key', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/resolved/Hero.astro' }) };
      const result = await resolveUserComponents(ctx, { 'hero-block': 'Hero.astro' } as any, '/src', false);
      // The registry key keeps the hyphen; the generated *variable* names must not,
      // or the emitted module is a syntax error.
      expect(result[0].registrationCall).toContain(`registerComponent("hero-block"`);
      expect(result[0].importStatement).not.toMatch(/__[A-Za-z0-9_$]*-/);
      expect(result[0].wrapperDefinition).not.toMatch(/__[A-Za-z0-9_$]*-/);
      expect(
        () => new Function(`${result[0].importStatement.replace(/^import (\S+) from .*$/, 'let $1;')}\n${result[0].wrapperDefinition}`)
      ).not.toThrow();
    });

    it('throws when a component cannot be resolved and fallback is disabled', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue(undefined) };
      await expect(resolveUserComponents(ctx, { Hero: 'Hero.astro' } as any, '/src', false)).rejects.toThrow(
        /Component could not be found for schema "Hero"/
      );
    });

    it('skips an unresolvable component instead of throwing when fallback is enabled', async () => {
      const ctx = { resolve: vi.fn().mockResolvedValue(undefined) };
      const result = await resolveUserComponents(ctx, { Hero: 'Hero.astro' } as any, '/src', true);
      expect(result).toEqual([]);
    });

    it('resolves the components it can and skips the rest when fallback is enabled', async () => {
      const ctx = {
        resolve: vi.fn().mockImplementation(async (path: string) => (path.includes('Hero') ? { id: path } : undefined)),
      };
      const result = await resolveUserComponents(ctx, { Hero: 'Hero.astro', Missing: 'Missing.astro' } as any, '/src', true);
      expect(result).toHaveLength(1);
      expect(result[0].registrationCall).toContain(`registerComponent("Hero"`);
    });
  });

  describe('vitePluginImportLocalessComponents', () => {
    it('resolveId claims the virtual module id and passes through everything else', async () => {
      const plugin = vitePluginImportLocalessComponents({}, '/src', false);
      const resolved = await (plugin.resolveId as any)('virtual:import-localess-components');
      expect(resolved).toBeTruthy();
      expect(await (plugin.resolveId as any)('something-else')).toBeUndefined();
    });

    it('load returns undefined for any id other than the resolved virtual module', async () => {
      const plugin = vitePluginImportLocalessComponents({}, '/src', false);
      expect(await (plugin.load as any)('not-the-virtual-module')).toBeUndefined();
    });

    it('load resolves the fallback and user components, then generates the module code', async () => {
      const plugin = vitePluginImportLocalessComponents({ Hero: 'Hero.astro' } as any, '/src', true);
      const resolvedId = await (plugin.resolveId as any)('virtual:import-localess-components');
      const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/resolved/Hero.astro' }) };
      const result = await (plugin.load as any).call(ctx, resolvedId);
      expect(result?.moduleType).toBe('js');
      expect(result?.code).toContain(`registerComponent("Hero"`);
      expect(result?.code).toContain('FallbackComponent');
    });
  });
});
