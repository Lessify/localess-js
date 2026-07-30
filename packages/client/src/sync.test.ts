import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadLocalessSync } from './sync';

describe('loadLocalessSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves immediately when running on the server (no window)', async () => {
    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
  });

  it('warns and resolves when not inside an iframe', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const win: any = {};
    win.self = win;
    win.top = win; // self === top => not an iframe
    vi.stubGlobal('window', win);

    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Localess Sync is loaded only in Visual Editor.');
  });

  it('resolves without injecting a script when sync is already loaded', async () => {
    const win: any = { localess: {} };
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);

    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
  });

  it('resolves without injecting a script when the script element already exists', async () => {
    const win: any = {};
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);
    const getElementById = vi.fn().mockReturnValue({});
    vi.stubGlobal('document', { getElementById });

    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
    expect(getElementById).toHaveBeenCalledWith('localess-js-sync');
  });

  it('injects the sync script with the expected src and resolves on load', async () => {
    const win: any = {};
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);
    const scriptEl: any = {};
    const appendChild = vi.fn();
    vi.stubGlobal('document', {
      getElementById: vi.fn().mockReturnValue(undefined),
      createElement: vi.fn().mockReturnValue(scriptEl),
      head: { appendChild },
    });

    const promise = loadLocalessSync('https://example.com');
    scriptEl.onload();

    await expect(promise).resolves.toBeUndefined();
    expect(scriptEl.src).toBe('https://example.com/scripts/sync-v1.js');
    expect(scriptEl.async).toBe(true);
    expect(appendChild).toHaveBeenCalledWith(scriptEl);
  });

  it('rejects when the sync script fails to load', async () => {
    const win: any = {};
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);
    const scriptEl: any = {};
    vi.stubGlobal('document', {
      getElementById: vi.fn().mockReturnValue(undefined),
      createElement: vi.fn().mockReturnValue(scriptEl),
      head: { appendChild: vi.fn() },
    });

    const promise = loadLocalessSync('https://example.com');
    const error = new Error('network error');
    scriptEl.onerror(error);

    await expect(promise).rejects.toBe(error);
  });
});
