import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

vi.mock('./utils', async importOriginal => ({
  // Only the environment/sync helpers are stubbed; the component-naming helpers
  // are the thing under test here, so they stay real.
  ...(await importOriginal<typeof import('./utils')>()),
  isBrowser: vi.fn(() => false),
  isIframe: vi.fn(() => false),
  loadLocalessSync: vi.fn(() => Promise.resolve()),
}));

import {
  getComponent,
  getFallbackComponent,
  getLocalessClient,
  isSyncEnabled,
  localessInit,
  localessSyncOn,
  localessSyncOnChange,
  resetClientForTest,
} from './client';
import { isBrowser, isIframe, loadLocalessSync } from './utils';

const HelloComponent = defineComponent({ render: () => h('div', 'hello') });

describe('state', () => {
  beforeEach(() => {
    resetClientForTest();
    vi.mocked(isBrowser).mockReturnValue(false);
    vi.mocked(isIframe).mockReturnValue(false);
    vi.mocked(loadLocalessSync).mockResolvedValue(undefined);
  });
  afterEach(() => {
    delete (window as unknown as { localess?: unknown }).localess;
  });

  it('localessInit registers components and returns a client', () => {
    const client = localessInit({
      origin: 'https://example.com',
      spaceId: 'space-1',
      token: 'public-token',
      components: { hero: HelloComponent },
    });
    expect(client).toBeDefined();
    expect(getComponent('hero')).toBe(HelloComponent);
    expect(getComponent('missing')).toBeUndefined();
  });

  it('localessInit registers a fallback component', () => {
    localessInit({
      origin: 'https://example.com',
      spaceId: 'space-1',
      token: 'public-token',
      fallbackComponent: HelloComponent,
    });
    expect(getFallbackComponent()).toBe(HelloComponent);
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

  it('getLocalessClient throws when not initialized', () => {
    expect(() => getLocalessClient()).toThrow(/No client found/);
  });

  it('isSyncEnabled is true when enableSync is passed and running inside an iframe', () => {
    vi.mocked(isBrowser).mockReturnValue(true);
    vi.mocked(isIframe).mockReturnValue(true);
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    expect(isSyncEnabled()).toBe(true);
  });

  it('localessInit logs an error when loadLocalessSync rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(loadLocalessSync).mockRejectedValue(new Error('script blocked'));

    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[Localess] Failed to load sync script.', expect.any(Error)));
    errorSpy.mockRestore();
  });

  it('localessSyncOn attaches a listener once sync is enabled and ready', async () => {
    vi.mocked(isBrowser).mockReturnValue(true);
    vi.mocked(isIframe).mockReturnValue(true);
    window.localess = { on: vi.fn(), onChange: vi.fn() };
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    const callback = vi.fn();

    localessSyncOn('input', callback);

    await vi.waitFor(() => expect(window.localess?.on).toHaveBeenCalledWith('input', callback));
  });

  it('localessSyncOnChange attaches a listener once sync is enabled and ready', async () => {
    vi.mocked(isBrowser).mockReturnValue(true);
    vi.mocked(isIframe).mockReturnValue(true);
    window.localess = { on: vi.fn(), onChange: vi.fn() };
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    const callback = vi.fn();

    localessSyncOnChange(callback);

    await vi.waitFor(() => expect(window.localess?.onChange).toHaveBeenCalledWith(callback));
  });
});
