import { describe, expect, it } from 'vitest';

import { vitePluginLocalessInit } from './vite-plugin-localess-init';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'secret-token' };

describe('vitePluginLocalessInit', () => {
  it('resolves the virtual module id', async () => {
    const plugin = vitePluginLocalessInit(baseOptions);
    const resolved = await (plugin.resolveId as any)('virtual:localess-init');

    expect(resolved).toBe('\0virtual:localess-init');
  });

  it('generates an SSR-graph module using the secret token', async () => {
    const plugin = vitePluginLocalessInit(baseOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: true });

    expect(loaded.code).toContain(`import { localessInit } from "@localess/react";`);
    expect(loaded.code).toContain(`import { localessComponents } from "virtual:localess-components";`);
    expect(loaded.code).toContain('"token":"secret-token"');
    expect(loaded.code).toContain('components: localessComponents');
  });

  it('generates a client-graph module using the public token when configured', async () => {
    const plugin = vitePluginLocalessInit({ ...baseOptions, publicToken: 'public-token' });
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: false });

    expect(loaded.code).toContain('"token":"public-token"');
    expect(loaded.code).not.toContain('secret-token');
  });

  it('generates a no-op client-graph module when no public token is configured', async () => {
    const plugin = vitePluginLocalessInit(baseOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: false });

    expect(loaded.code.trim()).toBe('export {}');
  });

  it('treats a missing ssr flag as client-graph', async () => {
    const plugin = vitePluginLocalessInit(baseOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init');

    expect(loaded.code.trim()).toBe('export {}');
  });

  it('embeds enableSync and other passthrough options', async () => {
    const plugin = vitePluginLocalessInit({ ...baseOptions, enableSync: true, debug: true, cacheTTL: 60 });
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: true });

    expect(loaded.code).toContain('"enableSync":true');
    expect(loaded.code).toContain('"debug":true');
    expect(loaded.code).toContain('"cacheTTL":60');
  });

  it('never embeds publicToken as a standalone field in the SSR module', async () => {
    const plugin = vitePluginLocalessInit({ ...baseOptions, publicToken: 'public-token' });
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: true });

    expect(loaded.code).not.toContain('publicToken');
  });
});
