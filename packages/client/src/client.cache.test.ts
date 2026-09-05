import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ICache } from './cache';
import { localessClient } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Records every key it is asked about, so tests can assert on key shape. */
function recordingCache(): ICache<unknown> & { keys: string[]; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const keys: string[] = [];
  return {
    keys,
    store,
    has(key: string) {
      keys.push(key);
      return store.has(key);
    },
    get(key: string) {
      return store.get(key);
    },
    set(key: string, value: unknown) {
      store.set(key, value);
    },
  };
}

/** Same, but every method returns a promise — the async half of the widened `ICache`. */
function asyncCache(): ICache<unknown> & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async has(key: string) {
      return store.has(key);
    },
    async get(key: string) {
      return store.get(key);
    },
    async set(key: string, value: unknown) {
      store.set(key, value);
    },
  };
}

function lastInit(): RequestInit {
  const calls = (fetch as any).mock.calls;
  return calls[calls.length - 1][1] as RequestInit;
}

describe('localessClient caching', () => {
  const baseOptions = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('injected cache', () => {
    it('reads and writes through a supplied synchronous cache', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache });

      await client.getLinks();
      expect(cache.store.size).toBe(1);

      await client.getLinks();
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('works with a cache whose methods return promises', async () => {
      const cache = asyncCache();
      const client = localessClient({ ...baseOptions, cache });

      await client.getLinks();
      await client.getLinks();

      expect(cache.store.size).toBe(1);
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('prefers a supplied cache over cacheTTL', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache, cacheTTL: 60 });

      await client.getLinks();

      expect(cache.store.size).toBe(1);
    });

    it('warns in debug mode when both cache and cacheTTL are set', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = localessClient({ ...baseOptions, cache: recordingCache(), cacheTTL: 60, debug: true });

      await client.getLinks();

      expect(warn).toHaveBeenCalled();
    });

    it('leaves cacheTTL behaviour untouched when no cache is supplied', async () => {
      const client = localessClient({ ...baseOptions, cacheTTL: 60 });

      await client.getLinks();
      await client.getLinks();

      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('still disables caching entirely with cacheTTL: false', async () => {
      const client = localessClient({ ...baseOptions, cacheTTL: false });

      await client.getLinks();
      await client.getLinks();

      expect((fetch as any).mock.calls).toHaveLength(2);
    });
  });

  describe('cache keys', () => {
    it('never includes the token', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache });

      await client.getLinks();

      expect(cache.keys.length).toBeGreaterThan(0);
      expect(cache.keys.every(key => !key.includes('token-123'))).toBe(true);
      expect([...cache.store.keys()].every(key => !key.includes('token-123'))).toBe(true);
    });

    it('is shared between two clients that differ only by token', async () => {
      const cache = recordingCache();
      const a = localessClient({ ...baseOptions, cache, token: 'token-aaa' });
      const b = localessClient({ ...baseOptions, cache, token: 'token-bbb' });

      await a.getLinks();
      await b.getLinks();

      expect(cache.store.size).toBe(1);
      expect((fetch as any).mock.calls).toHaveLength(1);
    });

    it('still distinguishes different requests', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache });

      await client.getContentBySlug('home');
      await client.getContentBySlug('about');

      expect(cache.store.size).toBe(2);
      expect((fetch as any).mock.calls).toHaveLength(2);
    });

    it('distinguishes the same slug at different locales', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache });

      await client.getContentBySlug('home', { locale: 'en' });
      await client.getContentBySlug('home', { locale: 'de' });

      expect(cache.store.size).toBe(2);
    });
  });

  describe('framework fetch options', () => {
    it('forwards an explicit next.tags verbatim', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { tags: ['my-tag'] } } });

      await client.getLinks();

      expect((lastInit() as any).next).toEqual({ tags: ['my-tag'] });
    });

    it('forwards next.revalidate', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { revalidate: 60 } } });

      await client.getLinks();

      expect((lastInit() as any).next.revalidate).toBe(60);
    });

    it('forwards a RequestCache mode', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { cache: 'no-store' } });

      await client.getLinks();

      expect(lastInit().cache).toBe('no-store');
    });

    it('generates the documented tags when next is set without explicit tags', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { revalidate: 60 } } });

      await client.getLinks();

      expect((lastInit() as any).next.tags).toEqual(['localess', 'localess:space:space-1', 'localess:links']);
    });

    it('tags a slug fetch with its slug', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { revalidate: 60 } } });

      await client.getContentBySlug('blog/hello');

      expect((lastInit() as any).next.tags).toEqual(['localess', 'localess:space:space-1', 'localess:slug:blog/hello']);
    });

    it('tags an id fetch with its content id', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { revalidate: 60 } } });

      await client.getContentById('content-9');

      expect((lastInit() as any).next.tags).toEqual(['localess', 'localess:space:space-1', 'localess:content:content-9']);
    });

    it('tags a translations fetch with its locale', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { revalidate: 60 } } });

      await client.getTranslations('de');

      expect((lastInit() as any).next.tags).toEqual(['localess', 'localess:space:space-1', 'localess:translations:de']);
    });

    it('lets an explicit tags array replace the generated one rather than merging', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { tags: ['only-mine'] } } });

      await client.getLinks();

      expect((lastInit() as any).next.tags).toEqual(['only-mine']);
    });

    it('sends no next or cache key when fetchInit is absent', async () => {
      const client = localessClient(baseOptions);

      await client.getLinks();

      const init = lastInit() as any;
      expect(init.next).toBeUndefined();
      expect(init.cache).toBeUndefined();
    });

    it('merges a per-call fetchInit over the client default', async () => {
      const client = localessClient({ ...baseOptions, fetchInit: { next: { revalidate: 60 } } });

      await client.getLinks({ fetchInit: { next: { revalidate: 5 } } });

      expect((lastInit() as any).next.revalidate).toBe(5);
    });

    it('accepts a per-call fetchInit when the client has none', async () => {
      const client = localessClient(baseOptions);

      await client.getLinks({ fetchInit: { cache: 'no-store' } });

      expect(lastInit().cache).toBe('no-store');
    });
  });

  describe('bypass rule', () => {
    it('does not read the internal cache when the request carries next', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache, fetchInit: { next: { revalidate: 60 } } });

      await client.getLinks();
      await client.getLinks();

      // Two caching layers over one call is how content survives a revalidateTag().
      expect((fetch as any).mock.calls).toHaveLength(2);
      expect(cache.store.size).toBe(0);
    });

    it('does not write the internal cache when the request carries a cache mode', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache, fetchInit: { cache: 'no-store' } });

      await client.getLinks();

      expect(cache.store.size).toBe(0);
    });

    it('bypasses only the requests that carry directives', async () => {
      const cache = recordingCache();
      const client = localessClient({ ...baseOptions, cache });

      await client.getLinks({ fetchInit: { next: { revalidate: 60 } } });
      expect(cache.store.size).toBe(0);

      await client.getLinks();
      expect(cache.store.size).toBe(1);
    });
  });
});
