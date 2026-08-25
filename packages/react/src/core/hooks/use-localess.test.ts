import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
