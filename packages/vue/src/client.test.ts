import { resetSyncForTest } from '@localess/live-preview';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

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
const HelloComponent = defineComponent({ render: () => h('div', 'hello') });

const SCRIPT_ID = 'localess-js-sync';

/**
 * Frames the page so the Visual Editor environment check passes. That check now
 * lives in `@localess/live-preview`, so it is faked at the environment level
 * rather than by stubbing a re-export.
 */
function enterEditorFrame(): void {
  vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
}

function syncScript(): HTMLElement | null {
  return document.getElementById(SCRIPT_ID);
}

describe('state', () => {
  beforeEach(() => {
    resetClientForTest();
    resetSyncForTest();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetSyncForTest();
    syncScript()?.remove();
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
    enterEditorFrame();
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    expect(isSyncEnabled()).toBe(true);
  });

  it('localessInit logs an error when the sync script fails to load', async () => {
    enterEditorFrame();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    syncScript()?.dispatchEvent(new Event('error'));

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[Localess] Failed to load sync script.', expect.anything()));
  });

  it('localessSyncOn attaches a listener once sync is enabled and ready', async () => {
    enterEditorFrame();
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    window.localess = { on: vi.fn(), onChange: vi.fn() };
    syncScript()?.dispatchEvent(new Event('load'));
    const callback = vi.fn();

    localessSyncOn('input', callback);

    await vi.waitFor(() => expect(window.localess?.on).toHaveBeenCalledWith('input', callback));
  });

  it('localessSyncOnChange attaches a listener once sync is enabled and ready', async () => {
    enterEditorFrame();
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token', enableSync: true });
    window.localess = { on: vi.fn(), onChange: vi.fn() };
    syncScript()?.dispatchEvent(new Event('load'));
    const callback = vi.fn();

    localessSyncOnChange(callback);

    await vi.waitFor(() => expect(window.localess?.onChange).toHaveBeenCalledWith(callback));
  });
});
