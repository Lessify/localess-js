import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { version } from '../package.json';
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

  it('leaves the script in quiet mode unless debug is on', () => {
    enterEditorFrame();
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    expect(document.getElementById(SCRIPT_ID)!.hasAttribute('data-debug')).toBe(false);
    expect(sync.isDebug()).toBe(false);
  });

  it('turns on the script debug mode when init is given debug', () => {
    enterEditorFrame();
    const sync = createSyncController();
    sync.init('https://cms.example.com', true, true);

    expect(document.getElementById(SCRIPT_ID)!.getAttribute('data-debug')).toBe('true');
    expect(sync.isDebug()).toBe(true);
  });

  it('labels the script with the SDK that loads it, at this package version', () => {
    enterEditorFrame();
    const sync = createSyncController('@localess/react');
    sync.init('https://cms.example.com', true);

    expect(document.getElementById(SCRIPT_ID)!.getAttribute('data-sdk')).toBe(`@localess/react@${version}`);
  });

  it('labels the script as live-preview when no SDK is given', () => {
    enterEditorFrame();
    createSyncController().init('https://cms.example.com', true);

    expect(document.getElementById(SCRIPT_ID)!.getAttribute('data-sdk')).toBe(`@localess/live-preview@${version}`);
  });

  it('logs the script load only in debug mode', async () => {
    enterEditorFrame();
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const quiet = createSyncController();
    quiet.init('https://cms.example.com', true);
    document.getElementById(SCRIPT_ID)!.dispatchEvent(new Event('load'));
    await quiet.ready();
    expect(info).not.toHaveBeenCalled();

    resetSyncForTest();
    document.getElementById(SCRIPT_ID)!.remove();
    const debug = createSyncController();
    debug.init('https://cms.example.com', true, true);
    document.getElementById(SCRIPT_ID)!.dispatchEvent(new Event('load'));
    await debug.ready();
    expect(info).toHaveBeenCalledWith('Localess Sync Script loaded');
  });

  it('does not subscribe when sync is unusable', () => {
    // Not framed, so sync is configured but unusable — the bridge must not be touched.
    const on = vi.fn();
    window.localess = { on, onChange: vi.fn(), off: vi.fn() };
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
    window.localess = { on, onChange: vi.fn(), off: vi.fn() };
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
    window.localess = { on: vi.fn(), onChange, off: vi.fn() };
    script!.dispatchEvent(new Event('load'));

    const callback = vi.fn();
    sync.onChange(callback);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(callback));
  });

  it("onDocument delivers only that document's edits, as data", async () => {
    enterEditorFrame();
    let listener: ((event: any) => void) | undefined;
    const onChange = vi.fn(callback => {
      listener = callback;
      return () => undefined;
    });
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);
    window.localess = { on: vi.fn(), onChange, off: vi.fn() };
    document.getElementById(SCRIPT_ID)!.dispatchEvent(new Event('load'));

    const callback = vi.fn();
    sync.onDocument('doc-1', callback);
    await vi.waitFor(() => expect(listener).toBeDefined());
    listener!({ type: 'input', documentId: 'header', data: { title: 'Header' } });
    const edit = { type: 'change', documentId: 'doc-1', data: { title: 'Edited' } };
    listener!(edit);

    expect(callback.mock.calls).toEqual([[{ title: 'Edited' }, edit]]);
  });

  describe('onDocument catching up on earlier edits', () => {
    /** A stand-in for the sync script: real subscribe/unsubscribe, and \`emit\` plays the editor. */
    function fakeSync() {
      const listeners = new Map<string, Set<(event: any) => void>>();
      const on = (types: string | string[], callback: (event: any) => void) => {
        const list = Array.isArray(types) ? types : [types];
        for (const type of list) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(callback);
        }
        return () => list.forEach(type => listeners.get(type)?.delete(callback));
      };
      return {
        localess: { on, onChange: (callback: (event: any) => void) => on(['input', 'change'], callback), off: vi.fn() },
        emit: (event: { type: string; documentId?: string; data?: unknown }) =>
          [...(listeners.get(event.type) ?? [])].forEach(callback => callback(event)),
      };
    }

    async function connected() {
      enterEditorFrame();
      const fake = fakeSync();
      const sync = createSyncController();
      sync.init('https://cms.example.com', true);
      window.localess = fake.localess as never;
      document.getElementById(SCRIPT_ID)!.dispatchEvent(new Event('load'));
      await sync.ready();
      return { sync, emit: fake.emit };
    }

    it("replays the editor's connect-time state to a subscriber that attaches afterwards", async () => {
      const { sync, emit } = await connected();
      // What the editor sends right after pong, before e.g. useLocaless has finished its fetch.
      const current = { type: 'change', documentId: 'doc-1', data: { title: 'Unsaved' } };
      emit({ type: 'pong' });
      emit(current);

      const callback = vi.fn();
      sync.onDocument('doc-1', callback);

      await vi.waitFor(() => expect(callback).toHaveBeenCalledWith({ title: 'Unsaved' }, current));
    });

    it('replays only the latest edit, then keeps delivering live edits once', async () => {
      const { sync, emit } = await connected();
      emit({ type: 'change', documentId: 'doc-1', data: { title: 'First' } });
      emit({ type: 'input', documentId: 'doc-1', data: { title: 'Second' } });

      const callback = vi.fn();
      sync.onDocument('doc-1', callback);
      await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
      emit({ type: 'input', documentId: 'doc-1', data: { title: 'Third' } });

      expect(callback.mock.calls.map(([data]) => data.title)).toEqual(['Second', 'Third']);
    });

    it("does not replay another document's edits", async () => {
      const { sync, emit } = await connected();
      emit({ type: 'change', documentId: 'header', data: { title: 'Header' } });

      const callback = vi.fn();
      sync.onDocument('doc-1', callback);
      await sync.ready();
      await Promise.resolve();

      expect(callback).not.toHaveBeenCalled();
    });

    it('forgets earlier edits when the editor reconnects', async () => {
      const { sync, emit } = await connected();
      emit({ type: 'change', documentId: 'doc-1', data: { title: 'Before' } });
      emit({ type: 'pong' });

      const callback = vi.fn();
      sync.onDocument('doc-1', callback);
      await sync.ready();
      await Promise.resolve();

      expect(callback).not.toHaveBeenCalled();
    });

    it('a subscriber attached before the edit gets it live, not twice', async () => {
      const { sync, emit } = await connected();
      const callback = vi.fn();
      sync.onDocument('doc-1', callback);
      await sync.ready();
      await Promise.resolve();
      emit({ type: 'change', documentId: 'doc-1', data: { title: 'Live' } });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  it('unsubscribes through the script once attached', async () => {
    enterEditorFrame();
    const detach = vi.fn();
    const on = vi.fn(() => detach);
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);
    window.localess = { on, onChange: vi.fn(), off: vi.fn() };
    document.getElementById(SCRIPT_ID)!.dispatchEvent(new Event('load'));

    const unsubscribe = sync.on('save', vi.fn());
    await vi.waitFor(() => expect(on).toHaveBeenCalled());
    unsubscribe();
    unsubscribe();

    expect(detach).toHaveBeenCalledTimes(1);
  });

  it('never attaches when unsubscribed before the script has loaded', async () => {
    enterEditorFrame();
    const on = vi.fn(() => vi.fn());
    const onChange = vi.fn(() => vi.fn());
    const sync = createSyncController();
    sync.init('https://cms.example.com', true);

    const onSave = vi.fn();
    const onEdit = vi.fn();
    sync.on('save', onSave)();
    sync.onChange(onEdit)();
    window.localess = { on, onChange, off: vi.fn() };
    document.getElementById(SCRIPT_ID)!.dispatchEvent(new Event('load'));
    await sync.ready();

    // The controller's own edit recorder does attach; the cancelled subscriptions must not.
    expect(on).not.toHaveBeenCalledWith('save', onSave);
    expect(onChange).not.toHaveBeenCalledWith(onEdit);
  });

  it('returns a harmless unsubscribe when sync is unusable', () => {
    const sync = createSyncController();

    expect(() => sync.on('save', vi.fn())()).not.toThrow();
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
    sync.init('https://cms.example.com', true, true);

    sync.reset();

    expect(sync.isConfigured()).toBe(false);
    expect(sync.isDebug()).toBe(false);
  });
});
