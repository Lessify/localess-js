// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleLocalessMessage } from './handle-localess-message';

describe('handleLocalessMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div data-ll-id="1" data-ll-schema="page">Old</div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as any).__localessSpaceId;
  });

  it('reloads immediately on save/publish/unpublish, without debouncing', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload, href: 'https://example.com/' });

    await handleLocalessMessage({ type: 'publish' } as any);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing synchronous for pong/enterSchema/hoverSchema/leaveSchema', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await handleLocalessMessage({ type: 'pong' } as any);
    await handleLocalessMessage({ type: 'enterSchema', id: '1', schema: 'page' } as any);

    vi.runAllTimers();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('debounces input/change events before POSTing, sending data and spaceId', async () => {
    (window as any).__localessSpaceId = 'space-1';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('<div data-ll-id="1" data-ll-schema="page">New</div>', { status: 200 }));
    vi.stubGlobal('location', { ...window.location, href: 'https://example.com/' });

    const data = { _id: '1', _schema: 'page' };
    await handleLocalessMessage({ type: 'input', data } as any);
    expect(fetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ data, spaceId: 'space-1' }) })
    );
  });

  it('morphdom-patches the DOM with the response body, keyed by data-ll-id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body><div data-ll-id="1" data-ll-schema="page">New</div></body></html>', { status: 200 })
    );
    vi.stubGlobal('location', { ...window.location, href: 'https://example.com/' });

    await handleLocalessMessage({ type: 'change', data: { _id: '1', _schema: 'page' } } as any);
    await vi.advanceTimersByTimeAsync(500);
    await vi.waitFor(() => expect(document.body.textContent).toContain('New'));
  });
});
