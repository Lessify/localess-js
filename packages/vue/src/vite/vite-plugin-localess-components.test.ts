import { describe, expect, it, vi } from 'vitest';

import { generateComponentsModuleCode, vitePluginLocalessComponents } from './vite-plugin-localess-components';

describe('generateComponentsModuleCode', () => {
  it('globs the components dir and kebab-cases filenames into keys', () => {
    const code = generateComponentsModuleCode('/src/components', []);
    expect(code).toContain("import.meta.glob('/src/components/**/*.vue'");
    expect(code).toContain('toKebabCase');
    expect(code).toContain('export { localessComponents }');
  });

  it('appends manual registrations after the glob, so they win on collision', () => {
    const code = generateComponentsModuleCode('/src/components', [{ key: 'hero', importPath: '/src/components/Hero.vue' }]);
    expect(code).toContain("import __manual_component_0__ from '/src/components/Hero.vue';");
    expect(code).toContain('localessComponents["hero"] = __manual_component_0__;');
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
