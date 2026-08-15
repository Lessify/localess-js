import { afterEach, describe, expect, it, vi } from 'vitest';

describe('loadLocalessSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('resolves immediately when running on the server (no window)', async () => {
    const { loadLocalessSync } = await import('./sync');
    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
  });

  it('warns and resolves when not inside an iframe', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const win: any = {};
    win.self = win;
    win.top = win; // self === top => not an iframe
    vi.stubGlobal('window', win);

    const { loadLocalessSync } = await import('./sync');
    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Localess Sync is loaded only in Visual Editor.');
  });

  it('resolves without injecting a script when sync is already loaded', async () => {
    const win: any = { localess: {} };
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);

    const { loadLocalessSync } = await import('./sync');
    await expect(loadLocalessSync('https://example.com')).resolves.toBeUndefined();
  });

  it('waits for the existing script element to actually finish loading, instead of resolving immediately', async () => {
    const win: any = {};
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);
    const listeners: Record<string, (event?: unknown) => void> = {};
    const scriptEl: any = {
      addEventListener: (type: string, cb: (event?: unknown) => void) => {
        listeners[type] = cb;
      },
    };
    const getElementById = vi.fn().mockReturnValue(scriptEl);
    vi.stubGlobal('document', { getElementById });

    const { loadLocalessSync } = await import('./sync');
    const promise = loadLocalessSync('https://example.com');

    // Not resolved yet — the pre-existing tag hasn't fired 'load'.
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    listeners.load();
    await expect(promise).resolves.toBeUndefined();
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

    const { loadLocalessSync } = await import('./sync');
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

    const { loadLocalessSync } = await import('./sync');
    const promise = loadLocalessSync('https://example.com');
    const error = new Error('network error');
    scriptEl.onerror(error);

    await expect(promise).rejects.toBe(error);
  });

  it('concurrent calls (e.g. React Strict Mode double-invoking an effect) share one promise, resolved only once the script truly loads', async () => {
    const win: any = {};
    win.self = win;
    win.top = {};
    vi.stubGlobal('window', win);
    const scriptEl: any = {};
    const createElement = vi.fn().mockReturnValue(scriptEl);
    vi.stubGlobal('document', {
      getElementById: vi.fn().mockReturnValue(undefined),
      createElement,
      head: { appendChild: vi.fn() },
    });

    const { loadLocalessSync } = await import('./sync');
    const first = loadLocalessSync('https://example.com');
    const second = loadLocalessSync('https://example.com');

    // Only one <script> tag is ever created for the two concurrent calls.
    expect(createElement).toHaveBeenCalledTimes(1);

    let firstResolved = false;
    let secondResolved = false;
    first.then(() => {
      firstResolved = true;
    });
    second.then(() => {
      secondResolved = true;
    });
    await Promise.resolve();
    expect(firstResolved).toBe(false);
    expect(secondResolved).toBe(false);

    scriptEl.onload();

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });
});
