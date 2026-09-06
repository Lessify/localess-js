import { resetSyncForTest } from '@localess/live-preview';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getComponent, getFallbackComponent, isSyncEnabled, localessInit, localessSyncOn, localessSyncOnChange } from './client';

class FakeComponent {}

const SCRIPT_ID = 'localess-js-sync';

/**
 * Frames the page so the Visual Editor environment check passes. The check lives
 * in `@localess/live-preview`, so it is faked at the environment level rather
 * than by stubbing a re-export.
 */
function enterEditorFrame(): void {
  vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
}

function syncScript(): HTMLElement | null {
  return document.getElementById(SCRIPT_ID);
}

describe('client', () => {
  beforeEach(() => {
    resetSyncForTest();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSyncForTest();
    syncScript()?.remove();
    delete (window as any).localess;
  });

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

  it('localessInit with enableSync injects the script and enables sync inside the editor frame', () => {
    enterEditorFrame();
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });

    expect(syncScript()).not.toBeNull();
    expect(isSyncEnabled()).toBe(true);
  });

  it('localessSyncOn subscribes via window.localess once sync is ready', async () => {
    enterEditorFrame();
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    const on = vi.fn();
    (window as any).localess = { on };
    syncScript()?.dispatchEvent(new Event('load'));
    const callback = vi.fn();

    localessSyncOn('input', callback);

    await vi.waitFor(() => expect(on).toHaveBeenCalledWith('input', callback));
  });

  it('localessSyncOnChange subscribes via window.localess.onChange once sync is ready', async () => {
    enterEditorFrame();
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    const onChange = vi.fn();
    (window as any).localess = { onChange };
    syncScript()?.dispatchEvent(new Event('load'));
    const callback = vi.fn();

    localessSyncOnChange(callback);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(callback));
  });
});

describe('getLocalessClient before init', () => {
  it('throws when called on a fresh module before localessInit', async () => {
    vi.resetModules();
    const state = await import('./client');
    expect(() => state.getLocalessClient()).toThrow('[Localess] No client found.');
  });
});
