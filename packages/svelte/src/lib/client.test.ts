import { describe, expect, it, vi } from 'vitest';

vi.mock('./utils', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils')>();
  return { ...actual, isIframe: () => true };
});

import { getComponent, getFallbackComponent, isSyncEnabled, localessInit, localessSyncOn, localessSyncOnChange } from './client';

class FakeComponent {}

describe('client', () => {
  it('localessInit registers components and returns a client', () => {
    const client = localessInit({
      origin: 'https://example.com',
      spaceId: 'space-1',
      token: 'public-token',
      components: { hero: FakeComponent as any },
    });
    expect(client).toBeDefined();
    expect(getComponent('hero')).toBe(FakeComponent);
    expect(getComponent('missing')).toBeUndefined();
  });

  it('localessInit registers a fallback component', () => {
    localessInit({
      origin: 'https://example.com',
      spaceId: 'space-1',
      token: 'public-token',
      fallbackComponent: FakeComponent as any,
    });
    expect(getFallbackComponent()).toBe(FakeComponent);
  });

  it('isSyncEnabled is false when enableSync was not passed', () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
    expect(isSyncEnabled()).toBe(false);
  });

  it('localessSyncOn is a no-op when sync is disabled', () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
    const callback = vi.fn();
    localessSyncOn('input', callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('localessSyncOnChange is a no-op when sync is disabled', () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
    const callback = vi.fn();
    localessSyncOnChange(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('localessInit with enableSync loads the sync script and enables sync (isBrowser/isIframe both true)', () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    expect(isSyncEnabled()).toBe(true);
  });

  it('localessSyncOn subscribes via window.localess once sync is ready', async () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    const on = vi.fn();
    (window as any).localess = { on };
    const callback = vi.fn();

    localessSyncOn('input', callback);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(on).toHaveBeenCalledWith('input', callback);
    delete (window as any).localess;
  });

  it('localessSyncOnChange subscribes via window.localess.onChange once sync is ready', async () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    const onChange = vi.fn();
    (window as any).localess = { onChange };
    const callback = vi.fn();

    localessSyncOnChange(callback);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onChange).toHaveBeenCalledWith(callback);
    delete (window as any).localess;
  });
});

describe('getLocalessClient before init', () => {
  it('throws when called on a fresh module before localessInit', async () => {
    vi.resetModules();
    const state = await import('./client');
    expect(() => state.getLocalessClient()).toThrow('[Localess] No client found.');
  });
});
