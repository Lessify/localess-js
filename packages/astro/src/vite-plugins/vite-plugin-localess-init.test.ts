import { describe, expect, it } from 'vitest';

import { vitePluginLocalessInit } from './vite-plugin-localess-init';

const clientOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'secret-token' };

describe('vitePluginLocalessInit', () => {
  it('resolves the virtual module id', async () => {
    const plugin = vitePluginLocalessInit(clientOptions);
    const resolved = await (plugin.resolveId as any)('virtual:localess-init');

    expect(resolved).toBe('\0virtual:localess-init');
  });

  it('generates code that imports localessClient from @localess/client', async () => {
    const plugin = vitePluginLocalessInit(clientOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init');

    expect(loaded.code).toContain(`import { localessClient } from "@localess/client";`);
  });

  it('embeds the client options as JSON and assigns to globalThis', async () => {
    const plugin = vitePluginLocalessInit(clientOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init');

    expect(loaded.code).toContain(JSON.stringify(clientOptions));
    expect(loaded.code).toContain('globalThis.localessClientInstance = localessClientInstance');
    expect(loaded.code).toContain('export { localessClientInstance }');
  });
});
