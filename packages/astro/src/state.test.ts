import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('state', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const baseOptions = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
  };

  it('throws when getLocalessClient is called before localessInit', async () => {
    const state = await import('./state');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => state.getLocalessClient()).toThrow('[Localess] No client found.');
  });

  it('throws when getOrigin is called before localessInit', async () => {
    const state = await import('./state');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => state.getOrigin()).toThrow('[Localess] No origin found.');
  });

  it('localessInit returns the client, and getLocalessClient/getOrigin return the same values afterwards', async () => {
    const state = await import('./state');

    const client = state.localessInit(baseOptions);

    expect(state.getLocalessClient()).toBe(client);
    expect(state.getOrigin()).toBe(baseOptions.origin);
  });

  it('registerComponent adds a component that getComponent then returns', async () => {
    const state = await import('./state');
    const Comp = {} as never;

    state.registerComponent('page', Comp);

    expect(state.getComponent('page')).toBe(Comp);
  });

  it('getComponent logs and returns undefined for an unknown key', async () => {
    const state = await import('./state');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(state.getComponent('missing')).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('missing'), expect.any(String), expect.any(String));
  });

  it('unregisterComponent removes a previously registered component', async () => {
    const state = await import('./state');
    const Comp = {} as never;
    state.registerComponent('page', Comp);

    state.unregisterComponent('page');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(state.getComponent('page')).toBeUndefined();
  });

  it('setComponents replaces the entire registry', async () => {
    const state = await import('./state');
    const Old = {} as never;
    const New = {} as never;
    state.registerComponent('old', Old);

    state.setComponents({ new: New });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(state.getComponent('new')).toBe(New);
    expect(state.getComponent('old')).toBeUndefined();
  });

  it('setFallbackComponent/getFallbackComponent round-trip', async () => {
    const state = await import('./state');
    const Fallback = {} as never;

    state.setFallbackComponent(Fallback);

    expect(state.getFallbackComponent()).toBe(Fallback);
  });

  it('isSyncConfigured reflects the enableSync flag passed to localessInit', async () => {
    const state = await import('./state');

    expect(state.isSyncConfigured()).toBe(false);

    state.localessInit({ ...baseOptions, enableSync: true });

    expect(state.isSyncConfigured()).toBe(true);
  });
});
