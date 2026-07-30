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

  it('resolveAsset builds the asset URL from the initialized origin and spaceId', async () => {
    const state = await import('./state');
    state.localessInit(baseOptions);

    expect(state.resolveAsset({ kind: 'ASSET', uri: 'images/logo.png' } as any)).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png'
    );
  });

  it('resolveAsset appends transform params as a query string', async () => {
    const state = await import('./state');
    state.localessInit(baseOptions);

    expect(state.resolveAsset({ kind: 'ASSET', uri: 'images/logo.png' } as any, { w: 800 })).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800'
    );
  });

  it('registers, retrieves, and unregisters components', async () => {
    const state = await import('./state');
    const Component = () => null;

    state.registerComponent('hero', Component);
    expect(state.getComponent('hero')).toBe(Component);

    state.unregisterComponent('hero');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(state.getComponent('hero')).toBeUndefined();
  });

  it('setComponents replaces the entire registry', async () => {
    const state = await import('./state');
    const ComponentA = () => null;
    const ComponentB = () => null;

    state.registerComponent('a', ComponentA);
    state.setComponents({ b: ComponentB });

    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(state.getComponent('a')).toBeUndefined();
    expect(state.getComponent('b')).toBe(ComponentB);
  });

  it('gets and sets the fallback component', async () => {
    const state = await import('./state');
    expect(state.getFallbackComponent()).toBeUndefined();

    const Fallback = () => null;
    state.setFallbackComponent(Fallback);
    expect(state.getFallbackComponent()).toBe(Fallback);
  });

  it('logs an error when a component key is not registered', async () => {
    const state = await import('./state');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(state.getComponent('missing')).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('isSyncEnabled is false when enableSync was not passed to localessInit', async () => {
    const state = await import('./state');
    state.localessInit(baseOptions);

    expect(state.isSyncEnabled()).toBe(false);
  });

  it('isSyncEnabled is false when enableSync is true but not running inside an iframe', async () => {
    const state = await import('./state');
    state.localessInit({ ...baseOptions, enableSync: true });

    // jsdom's default window is not embedded in an iframe (window.top === window.self).
    expect(state.isSyncEnabled()).toBe(false);
  });

  it('localessSyncReady resolves even when sync was never enabled', async () => {
    const state = await import('./state');
    state.localessInit(baseOptions);

    await expect(state.localessSyncReady()).resolves.toBeUndefined();
  });

  it('localessSyncOn is a no-op when sync is disabled', async () => {
    const state = await import('./state');
    state.localessInit(baseOptions);
    const callback = vi.fn();

    state.localessSyncOn('change', callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('localessSyncOnChange is a no-op when sync is disabled', async () => {
    const state = await import('./state');
    state.localessInit(baseOptions);
    const callback = vi.fn();

    state.localessSyncOnChange(callback);

    expect(callback).not.toHaveBeenCalled();
  });
});
