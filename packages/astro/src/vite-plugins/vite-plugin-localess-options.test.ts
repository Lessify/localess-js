import { describe, expect, it } from 'vitest';

import { vitePluginLocalessOptions } from './vite-plugin-localess-options';

describe('vitePluginLocalessOptions', () => {
  it('resolves the virtual module id', async () => {
    const plugin = vitePluginLocalessOptions({ componentsDir: 'src' });
    const resolved = await (plugin.resolveId as any)('virtual:localess-options');

    expect(resolved).toBe('\0virtual:localess-options');
  });

  it('does not resolve unrelated ids', async () => {
    const plugin = vitePluginLocalessOptions({ componentsDir: 'src' });
    const resolved = await (plugin.resolveId as any)('virtual:something-else');

    expect(resolved).toBeUndefined();
  });

  it('loads a default export containing the JSON-serialized options', async () => {
    const plugin = vitePluginLocalessOptions({ componentsDir: 'src', spaceId: 'space-1' });
    const loaded = await (plugin.load as any)('\0virtual:localess-options');

    expect(loaded.code).toBe(`export default ${JSON.stringify({ componentsDir: 'src', spaceId: 'space-1' })}`);
  });

  it('does not load unrelated ids', async () => {
    const plugin = vitePluginLocalessOptions({ componentsDir: 'src' });
    const loaded = await (plugin.load as any)('\0virtual:something-else');

    expect(loaded).toBeUndefined();
  });
});
