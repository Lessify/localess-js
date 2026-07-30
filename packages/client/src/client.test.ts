import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localessClient } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('localessClient', () => {
  const baseOptions = {
    origin: 'https://cms.example.com/',
    spaceId: 'space-1',
    token: 'token-123',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes a trailing slash in the origin', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({}));
    const client = localessClient(baseOptions);

    await client.getLinks();

    const url = (fetch as any).mock.calls[0][0] as string;
    expect(url.startsWith('https://cms.example.com/api/')).toBe(true);
  });

  describe('getLinks', () => {
    it('builds the URL with kind, parentSlug and excludeChildren params', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ items: [] }));
      const client = localessClient(baseOptions);

      const result = await client.getLinks({ kind: 'DOCUMENT', parentSlug: 'legal/policy', excludeChildren: true });

      expect(fetch).toHaveBeenCalledWith(
        'https://cms.example.com/api/v1/spaces/space-1/links?token=token-123&kind=DOCUMENT&parentSlug=legal/policy&excludeChildren=true',
        expect.any(Object)
      );
      expect(result).toEqual({ items: [] });
    });

    it('caches responses for identical requests', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ items: [] }));
      const client = localessClient(baseOptions);

      await client.getLinks();
      await client.getLinks();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not cache when cacheTTL is false', async () => {
      // Return a fresh Response per call - a real Response body can only be read once,
      // so reusing the same instance across calls would make the 2nd .json() throw.
      (fetch as any).mockImplementation(() => Promise.resolve(jsonResponse({ items: [] })));
      const client = localessClient({ ...baseOptions, cacheTTL: false });

      const first = await client.getLinks();
      const second = await client.getLinks();

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(first).toEqual({ items: [] });
      expect(second).toEqual({ items: [] });
    });

    it('returns an empty object and logs on fetch error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('network down'));
      const client = localessClient(baseOptions);

      const result = await client.getLinks();

      expect(result).toEqual({});
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getContentBySlug', () => {
    it('builds the URL with version, locale and resolve params', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ _id: 'c1' }));
      const client = localessClient(baseOptions);

      await client.getContentBySlug('home', {
        version: 'draft',
        locale: 'en',
        resolveReference: true,
        resolveLink: true,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://cms.example.com/api/v1/spaces/space-1/contents/slugs/home?token=token-123&version=draft&locale=en&resolveReference=true&resolveLink=true',
        expect.any(Object)
      );
    });

    it('uses the client-level version when no param version is given', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}));
      const client = localessClient({ ...baseOptions, version: 'draft' });

      await client.getContentBySlug('home');

      const url = (fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('version=draft');
    });

    it('lets the param version override the client-level version', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}));
      const client = localessClient({ ...baseOptions, version: 'draft' });

      await client.getContentBySlug('home', { version: 'draft' });

      const url = (fetch as any).mock.calls[0][0] as string;
      expect((url.match(/version=draft/g) ?? []).length).toBe(1);
    });

    it('returns an empty object and logs on fetch error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('boom'));
      const client = localessClient(baseOptions);

      const result = await client.getContentBySlug('home');

      expect(result).toEqual({});
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getContentById', () => {
    it('builds the URL with the content id', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ _id: 'c1' }));
      const client = localessClient(baseOptions);

      await client.getContentById('c1', { locale: 'de' });

      expect(fetch).toHaveBeenCalledWith(
        'https://cms.example.com/api/v1/spaces/space-1/contents/c1?token=token-123&locale=de',
        expect.any(Object)
      );
    });
  });

  describe('getTranslations', () => {
    it('builds the URL with the locale and version', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({}));
      const client = localessClient(baseOptions);

      await client.getTranslations('en', { version: 'draft' });

      expect(fetch).toHaveBeenCalledWith(
        'https://cms.example.com/api/v1/spaces/space-1/translations/en?token=token-123&version=draft',
        expect.any(Object)
      );
    });

    it('returns an empty object and logs on fetch error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('boom'));
      const client = localessClient(baseOptions);

      const result = await client.getTranslations('en');

      expect(result).toEqual({});
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('syncScriptUrl', () => {
    it('returns the sync script URL for the normalized origin', () => {
      const client = localessClient(baseOptions);
      expect(client.syncScriptUrl()).toBe('https://cms.example.com/scripts/sync-v1.js');
    });
  });

  describe('assetLink', () => {
    it('builds a link from an asset URI string', () => {
      const client = localessClient(baseOptions);
      expect(client.assetLink('images/logo.png')).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
    });

    it('builds a link from a ContentAsset object', () => {
      const client = localessClient(baseOptions);
      expect(client.assetLink({ kind: 'ASSET', uri: 'images/logo.png' })).toBe(
        'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png'
      );
    });

    it('appends transform params as a query string', () => {
      const client = localessClient(baseOptions);
      expect(client.assetLink('images/logo.png', { w: 800, h: 600 })).toBe(
        'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800&h=600'
      );
    });
  });

  it('logs debug information when debug is enabled', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    (fetch as any).mockResolvedValue(jsonResponse({}));
    const client = localessClient({ ...baseOptions, debug: true });

    await client.getLinks();

    expect(logSpy).toHaveBeenCalled();
  });
});
