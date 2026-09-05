import { beforeEach, describe, expect, it, vi } from 'vitest';

const kit = {
  addComponent: vi.fn(),
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addTemplate: vi.fn(),
  createResolver: () => ({ resolve: (p: string) => `/resolved${p.replace(/^\./, '')}` }),
  defineNuxtModule: (definition: any) => definition,
  updateTemplates: vi.fn(),
};

vi.mock('@nuxt/kit', () => kit);

const moduleDefinition = (await import('./module')).default as any;

function createNuxt() {
  return {
    options: {
      alias: { '~': '/app' },
      build: { transpile: [] as unknown[] },
      rootDir: '/app',
      runtimeConfig: { public: {} } as Record<string, any>,
      vite: {} as Record<string, any>,
    },
    hook: vi.fn(),
  };
}

async function setup(options: Record<string, unknown>) {
  const nuxt = createNuxt();
  const merged = { ...moduleDefinition.defaults, ...options };
  await moduleDefinition.setup(merged, nuxt);
  return nuxt;
}

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1' };

describe('module setup — token placement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('puts the public token in runtimeConfig.public.localess', async () => {
    const nuxt = await setup({ ...baseOptions, token: 'public-token' });

    expect(nuxt.options.runtimeConfig.public.localess.token).toBe('public-token');
  });

  it('keeps serverToken out of runtimeConfig.public entirely', async () => {
    const nuxt = await setup({ ...baseOptions, token: 'public-token', serverToken: 'secret-token' });

    expect(nuxt.options.runtimeConfig.localess.serverToken).toBe('secret-token');
    expect(JSON.stringify(nuxt.options.runtimeConfig.public)).not.toContain('secret-token');
  });

  it('never writes serverToken into public even when it is the only token', async () => {
    const nuxt = await setup({ ...baseOptions, serverToken: 'secret-token' });

    expect(JSON.stringify(nuxt.options.runtimeConfig.public)).not.toContain('secret-token');
  });

  it('warns at build time when only serverToken is set', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await setup({ ...baseOptions, serverToken: 'secret-token' });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('client-side fetching is disabled'));
  });

  it('does not warn when a public token is set', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await setup({ ...baseOptions, token: 'public-token' });

    expect(warn).not.toHaveBeenCalled();
  });

  it('fails when neither token is configured', async () => {
    await expect(setup(baseOptions)).rejects.toThrow(/token.*serverToken|serverToken/);
  });

  it('fails when origin or spaceId is missing', async () => {
    await expect(setup({ spaceId: 'space-1', token: 't' })).rejects.toThrow(/origin/);
    await expect(setup({ origin: 'https://cms.example.com', token: 't' })).rejects.toThrow(/spaceId/);
  });
});

describe('module setup — wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the runtime plugin', async () => {
    await setup({ ...baseOptions, token: 'public-token' });

    expect(kit.addPlugin).toHaveBeenCalledWith('/resolved/runtime/plugin');
  });

  it('aliases #localess/server in both the app and nitro graphs', async () => {
    const nuxt = await setup({ ...baseOptions, token: 'public-token' });

    expect(nuxt.options.alias['#localess/server']).toBe('/resolved/runtime/server/index');
    expect(nuxt.hook).toHaveBeenCalledWith('nitro:config', expect.any(Function));
  });

  it('auto-imports useLocaless and auto-registers LocalessDocument', async () => {
    await setup({ ...baseOptions, token: 'public-token' });

    expect(kit.addImports).toHaveBeenCalledWith(expect.objectContaining({ name: 'useLocaless', from: '@localess/vue' }));
    expect(kit.addComponent).toHaveBeenCalledWith(expect.objectContaining({ name: 'LocalessDocument', filePath: '@localess/vue' }));
  });

  it('keeps componentNaming out of runtimeConfig entirely — it is applied when the registry is generated', async () => {
    const nuxt = await setup({ ...baseOptions, token: 'public-token', componentNaming: 'camelCase' });

    expect(nuxt.options.runtimeConfig.public.localess.componentNaming).toBeUndefined();
    expect(JSON.stringify(nuxt.options.runtimeConfig)).not.toContain('camelCase');
  });

  it('transpiles @localess/vue', async () => {
    const nuxt = await setup({ ...baseOptions, token: 'public-token' });

    expect(nuxt.options.build.transpile).toContain('@localess/vue');
  });
});
