import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeConfig: { localess: Record<string, unknown>; public: { localess: Record<string, unknown> } } = {
  localess: {},
  public: { localess: {} },
};

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }));

const localessClient = vi.fn((_options: Record<string, unknown>) => ({ getLinks: vi.fn() }));
vi.mock('@localess/vue', () => ({ localessClient: (options: Record<string, unknown>) => localessClient(options) }));

const { resetServerClientForTest, useLocalessServerClient } = await import('./client');

describe('useLocalessServerClient', () => {
  beforeEach(() => {
    resetServerClientForTest();
    localessClient.mockClear();
    runtimeConfig.localess = { serverToken: 'secret-token' };
    runtimeConfig.public.localess = { origin: 'https://cms.example.com', spaceId: 'space-1', debug: false };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a client from the secret serverToken', () => {
    useLocalessServerClient();

    expect(localessClient).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'secret-token', origin: 'https://cms.example.com', spaceId: 'space-1' })
    );
  });

  it('never uses the public token', () => {
    runtimeConfig.public.localess.token = 'public-token';

    useLocalessServerClient();

    expect(localessClient).not.toHaveBeenCalledWith(expect.objectContaining({ token: 'public-token' }));
  });

  it('memoises the client across calls', () => {
    const first = useLocalessServerClient();
    const second = useLocalessServerClient();

    expect(first).toBe(second);
    expect(localessClient).toHaveBeenCalledTimes(1);
  });

  it('forwards cacheTTL from the private config', () => {
    runtimeConfig.localess.cacheTTL = 60;

    useLocalessServerClient();

    expect(localessClient).toHaveBeenCalledWith(expect.objectContaining({ cacheTTL: 60 }));
  });

  it('throws a message naming serverToken when it is missing', () => {
    runtimeConfig.localess = {};

    expect(() => useLocalessServerClient()).toThrow(/serverToken/);
  });

  it('throws when called in the browser, naming the cause', () => {
    vi.stubGlobal('window', {});

    expect(() => useLocalessServerClient()).toThrow(/called in the browser/);
  });

  it('does not construct a client when called in the browser', () => {
    vi.stubGlobal('window', {});

    expect(() => useLocalessServerClient()).toThrow();
    expect(localessClient).not.toHaveBeenCalled();
  });
});

describe('runtimeConfig coercion', () => {
  beforeEach(() => {
    resetServerClientForTest();
    localessClient.mockClear();
    runtimeConfig.localess = { serverToken: 'secret-token' };
    runtimeConfig.public.localess = { origin: 'https://cms.example.com', spaceId: 'space-1' };
  });

  it('drops the empty string Nuxt substitutes for an unset cacheTTL', () => {
    runtimeConfig.localess.cacheTTL = '';

    useLocalessServerClient();

    expect(localessClient).toHaveBeenCalledWith(expect.objectContaining({ cacheTTL: undefined }));
  });

  it('preserves an explicit cacheTTL of false', () => {
    runtimeConfig.localess.cacheTTL = false;

    useLocalessServerClient();

    expect(localessClient).toHaveBeenCalledWith(expect.objectContaining({ cacheTTL: false }));
  });
});
