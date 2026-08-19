import { describe, expect, it } from 'vitest';

import { createVirtualModulePlugin } from './create-virtual-module-plugin';

describe('createVirtualModulePlugin', () => {
  it('resolves the given virtual module id to its \\0-prefixed form', async () => {
    const plugin = createVirtualModulePlugin('test-plugin', 'virtual:test', () => 'export default 1;');
    const resolved = await (plugin.resolveId as any)('virtual:test');

    expect(resolved).toBe('\0virtual:test');
  });

  it('does not resolve unrelated ids', async () => {
    const plugin = createVirtualModulePlugin('test-plugin', 'virtual:test', () => 'export default 1;');
    const resolved = await (plugin.resolveId as any)('virtual:something-else');

    expect(resolved).toBeUndefined();
  });

  it('loads the resolved id by calling load() and wrapping the result', async () => {
    const plugin = createVirtualModulePlugin('test-plugin', 'virtual:test', () => 'export default 42;');
    const loaded = await (plugin.load as any)('\0virtual:test');

    expect(loaded).toEqual({ code: 'export default 42;', moduleType: 'js' });
  });

  it('awaits an async load() function', async () => {
    const plugin = createVirtualModulePlugin('test-plugin', 'virtual:test', async () => 'export default 7;');
    const loaded = await (plugin.load as any)('\0virtual:test');

    expect(loaded).toEqual({ code: 'export default 7;', moduleType: 'js' });
  });

  it('does not load unrelated ids', async () => {
    const plugin = createVirtualModulePlugin('test-plugin', 'virtual:test', () => 'export default 1;');
    const loaded = await (plugin.load as any)('\0virtual:something-else');

    expect(loaded).toBeUndefined();
  });

  it('exposes the given plugin name', () => {
    const plugin = createVirtualModulePlugin('my-plugin-name', 'virtual:test', () => '');

    expect(plugin.name).toBe('my-plugin-name');
  });
});
