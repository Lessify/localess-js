import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localessEditable, localessEditableField } from './editable';
import { isBrowser, isIframe, isServer } from './platform';
import { resetSyncForTest } from './sync';
import { createSyncController } from './sync-controller';

const SCRIPT_ID = 'localess-js-sync';

/** Frames the page so `isIframe()` is true, as it is inside the Visual Editor. */
function enterEditorFrame(): void {
  vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
}

afterEach(() => {
  vi.restoreAllMocks();
  resetSyncForTest();
  document.getElementById(SCRIPT_ID)?.remove();
  delete (window as { localess?: unknown }).localess;
});

describe('platform', () => {
  it('detects a browser', () => {
    expect(isBrowser()).toBe(true);
    expect(isServer()).toBe(false);
  });

  it('is not framed by default', () => {
    expect(isIframe()).toBe(false);
  });

  it('is framed when window.top differs from window.self', () => {
    enterEditorFrame();

    expect(isIframe()).toBe(true);
  });
});

describe('localessEditable', () => {
  it('emits the id and schema attributes the editor looks for', () => {
    expect(localessEditable({ _id: 'abc', _schema: 'Page' })).toEqual({
      'data-ll-id': 'abc',
      'data-ll-schema': 'Page',
    });
  });

  it('emits the field attribute', () => {
    expect(localessEditableField('title')).toEqual({ 'data-ll-field': 'title' });
  });
});

describe('createSyncController', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('is disabled until init is called', () => {
    const sync = createSyncController();

    expect(sync.isEnabled()).toBe(false);
    expect(sync.isConfigured()).toBe(false);
  });

  it('stays disabled when enableSync is falsy', () => {
    const sync = createSyncController();
    sync.init('https://cms.example.com', false);

    expect(sync.isConfigured()).toBe(false);
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
  });

  it('records the flag but stays unusable outside the editor frame', () => {
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    // isConfigured reflects configuration; isEnabled reflects usability.
    expect(sync.isConfigured()).toBe(true);
    expect(sync.isEnabled()).toBe(false);
    expect(warn).toHaveBeenCalledWith('Localess Sync is loaded only in Visual Editor.');
  });

  it('injects the script from the given origin inside the editor frame', () => {
    enterEditorFrame();
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script!.src).toBe('https://cms.example.com/scripts/sync-v1.js');
    expect(script!.async).toBe(true);
    expect(sync.isEnabled()).toBe(true);
  });

  it('does not subscribe when sync is unusable', () => {
    // Not framed, so sync is configured but unusable — the bridge must not be touched.
    const on = vi.fn();
    window.localess = { on, onChange: vi.fn() };
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    sync.on('input', vi.fn());

    expect(on).not.toHaveBeenCalled();
  });

  it('subscribes once the script is ready', async () => {
    enterEditorFrame();
    const on = vi.fn();
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    // Real sequence: the script is injected, then installs the bridge, then loads.
    // Setting window.localess first would make loadLocalessSync take its
    // already-loaded early return and skip the path under test.
    const script = document.getElementById(SCRIPT_ID);
    expect(script).not.toBeNull();
    window.localess = { on, onChange: vi.fn() };
    script!.dispatchEvent(new Event('load'));

    const callback = vi.fn();
    sync.on('input', callback);

    await vi.waitFor(() => expect(on).toHaveBeenCalledWith('input', callback));
  });

  it('subscribes to change and input via onChange', async () => {
    enterEditorFrame();
    const onChange = vi.fn();
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    const script = document.getElementById(SCRIPT_ID);
    expect(script).not.toBeNull();
    window.localess = { on: vi.fn(), onChange };
    script!.dispatchEvent(new Event('load'));

    const callback = vi.fn();
    sync.onChange(callback);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(callback));
  });

  it('logs rather than throws when the script fails to load', async () => {
    enterEditorFrame();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    const script = document.getElementById(SCRIPT_ID);
    expect(script).not.toBeNull();
    script!.dispatchEvent(new Event('error'));

    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('[Localess] Failed to load sync script.', expect.anything()));
    await expect(sync.ready()).resolves.toBeUndefined();
  });

  it('resolves ready immediately when sync was never enabled', async () => {
    const sync = createSyncController();

    await expect(sync.ready()).resolves.toBeUndefined();
  });

  it('gives each controller independent state, as separate module graphs need', () => {
    const a = createSyncController();
    const b = createSyncController();

    a.init('https://cms.example.com', true);

    expect(a.isConfigured()).toBe(true);
    expect(b.isConfigured()).toBe(false);
  });

  it('reset clears state', () => {
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    sync.reset();

    expect(sync.isConfigured()).toBe(false);
  });
});
