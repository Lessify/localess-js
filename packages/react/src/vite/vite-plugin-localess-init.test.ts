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

  it('generates a client-graph module using the same secret token', async () => {
    const plugin = vitePluginLocalessInit(baseOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: false });

    expect(loaded.code).toContain('"token":"secret-token"');
  });

  it('generates the same module when the ssr flag is missing', async () => {
    const plugin = vitePluginLocalessInit(baseOptions);
    const loaded = await (plugin.load as any)('\0virtual:localess-init');

    expect(loaded.code).toContain('"token":"secret-token"');
  });

  it('embeds enableSync and other passthrough options', async () => {
    const plugin = vitePluginLocalessInit({ ...baseOptions, enableSync: true, debug: true, cacheTTL: 60 });
    const loaded = await (plugin.load as any)('\0virtual:localess-init', { ssr: true });

    expect(loaded.code).toContain('"enableSync":true');
    expect(loaded.code).toContain('"debug":true');
    expect(loaded.code).toContain('"cacheTTL":60');
  });
});

describe('componentNaming pass-through', () => {
  const base = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 't' };

  async function generated(options: Record<string, unknown>) {
    const plugin = vitePluginLocalessInit(options as never);
    const resolved = await (plugin.resolveId as any)('virtual:localess-init');
    const loaded = await (plugin.load as any).call({}, resolved);
    return loaded.code as string;
  }

  it('threads componentNaming into the generated localessInit call', async () => {
    const code = await generated({ ...base, componentNaming: 'camelCase' });

    expect(code).toContain('"componentNaming":"camelCase"');
  });

  it('omits componentNaming when it is not configured', async () => {
    const code = await generated(base);

    expect(code).not.toContain('componentNaming');
  });

  it('keeps the generated call valid JSON-serializable output', async () => {
    const code = await generated({ ...base, componentNaming: 'kebab-case' });

    expect(code).toContain('localessInit(');
    expect(code).toContain('components: localessComponents');
  });
});
