import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as state from '../client';
import { localessInit } from '../client';
import { useLocaless } from './use-localess';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('useLocaless', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localessInit({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123', cacheTTL: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns undefined initially, then the fetched content', async () => {
    (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ _id: 'c1', _schema: 'page', data: { title: 'Hello' } })));

    const { result } = renderHook(() => useLocaless('home'));

    expect(result.current).toBeUndefined();

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.data).toEqual({ title: 'Hello' });
  });

  it('keeps exactly one sync subscription across slug changes, and none after unmount', async () => {
    (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ _id: 'c1', _schema: 'page', data: {} })));
    let active = 0;
    vi.spyOn(state, 'localessSyncOnDocument').mockImplementation(() => {
      active++;
      return () => active--;
    });

    const { rerender, unmount, result } = renderHook(({ slug }) => useLocaless(slug), { initialProps: { slug: 'home' } });
    await waitFor(() => expect(active).toBe(1));
    rerender({ slug: 'about' });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current).toBeDefined());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(active).toBe(1);

    unmount();
    expect(active).toBe(0);
  });

  it('keeps the latest slug when an earlier request answers last', async () => {
    const pending = new Map<string, (response: Response) => void>();
    (fetch as any).mockImplementation((url: string) => {
      const slug = url.includes('/slugs/about') ? 'about' : 'home';
      return new Promise<Response>(resolve => pending.set(slug, resolve));
    });

    const { rerender, result } = renderHook(({ slug }) => useLocaless(slug), { initialProps: { slug: 'home' } });
    await waitFor(() => expect(pending.has('home')).toBe(true));
    rerender({ slug: 'about' });
    await waitFor(() => expect(pending.has('about')).toBe(true));

    pending.get('about')!(jsonResponse({ id: 'about', _schema: 'page', data: { title: 'About' } }));
    await waitFor(() => expect(result.current?.data).toEqual({ title: 'About' }));
    pending.get('home')!(jsonResponse({ id: 'home', _schema: 'page', data: { title: 'Home' } }));
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(result.current?.data).toEqual({ title: 'About' });
  });

  it('applies the edits of the fetched document', async () => {
    (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ id: 'c1', _schema: 'page', data: { title: 'Hello' } })));
    let subscription: { documentId: string; callback: (data: any) => void } | undefined;
    vi.spyOn(state, 'localessSyncOnDocument').mockImplementation((documentId, callback) => {
      subscription = { documentId, callback };
      return () => undefined;
    });

    const { result } = renderHook(() => useLocaless('home'));
    await waitFor(() => expect(subscription).toBeDefined());
    // Filtering by id is covered by the sync controller's tests.
    expect(subscription!.documentId).toBe('c1');

    act(() => subscription!.callback({ title: 'Edited' }));
    expect(result.current?.data).toEqual({ title: 'Edited' });
  });

  it('joins an array slug with slashes when building the request', async () => {
    (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ _id: 'c1', _schema: 'page', data: {} })));

    renderHook(() => useLocaless(['blog', 'my-post']));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const url = (fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/contents/slugs/blog/my-post');
  });

  it('forwards fetch params such as locale to the client', async () => {
    (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ _id: 'c1', _schema: 'page', data: {} })));

    renderHook(() => useLocaless('home', { locale: 'de' }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const url = (fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('locale=de');
  });
});
