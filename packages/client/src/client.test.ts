import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalessApiError, LocalessNetworkError, localessClient } from './client';

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

  it('sends the current package version in the X-Localess-Agent-Version header', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({}));
    const client = localessClient(baseOptions);

    await client.getLinks();

    const requestInit = (fetch as any).mock.calls[0][1] as RequestInit;
    expect((requestInit.headers as Record<string, string>)['X-Localess-Agent-Version']).toBe('3.4.1');
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

    it('rejects and logs on network error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalError = new Error('network down');
      (fetch as any).mockRejectedValue(originalError);
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error).toBeInstanceOf(LocalessNetworkError);
      expect(error.cause).toBe(originalError);
      expect(error.origin).toBe('https://cms.example.com');
      expect(error.hint).toContain('firewall');
      expect(error.url).not.toContain('token-123');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('rejects with LocalessApiError on a non-2xx response, with a status-specific hint and a redacted url', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }));
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error).toBeInstanceOf(LocalessApiError);
      expect(error.status).toBe(401);
      expect(error.hint).toContain('Missing or invalid API token');
      expect(error.hint).toContain('https://cms.example.com/features/spaces/space-1/settings/tokens');
      expect(error.url).not.toContain('token-123');
      expect(error.url).toContain('token=***');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('includes the API response body and its message in the hint on a 403', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Space access denied' }), { status: 403, statusText: 'Forbidden' })
      );
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error).toBeInstanceOf(LocalessApiError);
      expect(error.body).toEqual({ message: 'Space access denied' });
      expect(error.hint).toContain("doesn't have access");
      expect(error.hint).toContain('https://cms.example.com/features/spaces/space-1/settings/tokens');
      expect(error.hint).toContain('Space access denied');
    });

    it('includes the API response body message and status code in the hint', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Draft content requires DRAFT permission', status: 'PERMISSION_DENIED' }), {
          status: 403,
          statusText: 'Forbidden',
        })
      );
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error).toBeInstanceOf(LocalessApiError);
      expect(error.body).toEqual({ message: 'Draft content requires DRAFT permission', status: 'PERMISSION_DENIED' });
      expect(error.hint).toContain('Draft content requires DRAFT permission');
      expect(error.hint).toContain('PERMISSION_DENIED');
    });

    it('includes the reason, required permissions, and API hint from body.details on a 403', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(
        new Response(
          JSON.stringify({
            details: {
              requiredPermissions: ['content:draft:read'],
              reason: 'This request includes a `version` query parameter, which requires access to draft content.',
              hint: 'Add one of the required permissions to this token, or use a token that already has it.',
            },
            message: 'Token is missing a required permission',
            status: 'PERMISSION_DENIED',
          }),
          { status: 403, statusText: 'Forbidden' }
        )
      );
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error).toBeInstanceOf(LocalessApiError);
      expect(error.hint).toContain('Token is missing a required permission');
      expect(error.hint).toContain('Reason: This request includes a `version` query parameter');
      expect(error.hint).toContain('Required permission(s): content:draft:read.');
      expect(error.hint).toContain('Add one of the required permissions to this token');

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('Reason');
      expect(logged).toContain('Required');
      expect(logged).toContain('content:draft:read');
    });

    it('computes a rate-limit hint on a 429', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 429, statusText: 'Too Many Requests' }));
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error.hint).toContain('Rate limited');
      expect(error.body).toBeUndefined();
    });

    it('computes a transient-server-error hint on a 5xx', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 503, statusText: 'Service Unavailable' }));
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error.hint).toContain('transient');
    });

    it('falls back to a generic hint for an uncovered status code', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 418, statusText: "I'm a teapot" }));
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error.hint).toContain('Unexpected response');
    });

    it('captures a non-JSON response body as raw text', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('upstream timeout', { status: 502, statusText: 'Bad Gateway' }));
      const client = localessClient(baseOptions);

      const error = await client.getLinks().catch(e => e);

      expect(error.body).toBe('upstream timeout');
      expect(error.hint).toContain('upstream timeout');
    });
  });

  describe('boxed error console output', () => {
    const originalIsTTY = process.stdout.isTTY;

    afterEach(() => {
      process.stdout.isTTY = originalIsTTY;
    });

    it('logs a boxed error message for a LocalessApiError', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Space access denied' }), { status: 403, statusText: 'Forbidden' })
      );
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('┌');
      expect(logged).toContain('Localess API Error — getLinks');
      expect(logged).toContain('Status');
      expect(logged).toContain('403');
      expect(logged).toContain('Hint');
      expect(logged).toContain("doesn't have access");
    });

    it('logs a boxed error message with a Code row when the body carries a status code', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Draft content requires DRAFT permission', status: 'PERMISSION_DENIED' }), {
          status: 403,
          statusText: 'Forbidden',
        })
      );
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('Code');
      expect(logged).toContain('PERMISSION_DENIED');
    });

    it('logs a boxed error message for a LocalessNetworkError', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('network down'));
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('┌');
      expect(logged).toContain('Localess Network Error — getLinks');
      expect(logged).toContain('Origin');
      expect(logged).toContain('Cause');
      expect(logged).toContain('network down');
    });

    it('includes ANSI color codes when running in a color-capable TTY', async () => {
      process.stdout.isTTY = true;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 500, statusText: 'Internal Server Error' }));
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('\x1b[');
    });

    it('omits ANSI color codes when NO_COLOR is set, even in a TTY', async () => {
      process.stdout.isTTY = true;
      vi.stubEnv('NO_COLOR', '1');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 500, statusText: 'Internal Server Error' }));
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('┌');
      expect(logged).not.toContain('\x1b[');

      vi.unstubAllEnvs();
    });

    it('omits ANSI color codes when NEXT_RUNTIME is set, even in a TTY', async () => {
      process.stdout.isTTY = true;
      vi.stubEnv('NEXT_RUNTIME', 'nodejs');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 500, statusText: 'Internal Server Error' }));
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      expect(logged).toContain('┌');
      expect(logged).not.toContain('\x1b[');

      vi.unstubAllEnvs();
    });

    it('wraps a long hint across multiple box lines', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 403, statusText: 'Forbidden' }));
      const client = localessClient(baseOptions);

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      const lines = logged.split('\n');
      const hintLineIndex = lines.findIndex(l => l.includes('Hint'));

      expect(hintLineIndex).toBeGreaterThanOrEqual(0);
      // At least one wrapped continuation line before the box's bottom border.
      expect(lines.length).toBeGreaterThan(hintLineIndex + 2);
    });

    it('wraps a long URL without breaking the box border alignment', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('', { status: 403, statusText: 'Forbidden' }));
      const client = localessClient({
        ...baseOptions,
        spaceId: 'a-deliberately-long-space-id-to-push-the-url-well-past-the-box-width',
      });

      await client.getLinks().catch(() => {});

      const logged = errorSpy.mock.calls[0][1] as string;
      // First line is the "<methodLabel> error :" prefix, not part of the box itself.
      const boxLines = logged.split('\n').slice(1);

      expect(boxLines.length).toBeGreaterThan(1);
      // Every box line (top/bottom border, title, divider, and content rows) must be the
      // same total width — otherwise the right-hand border no longer lines up.
      const widths = new Set(boxLines.map(l => l.length));
      expect(widths.size).toBe(1);
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
        resolveAsset: true,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://cms.example.com/api/v1/spaces/space-1/contents/slugs/home?token=token-123&version=draft&locale=en&resolveReference=true&resolveLink=true&resolveAsset=true',
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

    it('rejects and logs on network error, wrapped as LocalessNetworkError', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('boom'));
      const client = localessClient(baseOptions);

      const error = await client.getContentBySlug('home').catch(e => e);

      expect(error).toBeInstanceOf(LocalessNetworkError);
      expect(error.cause).toBeInstanceOf(Error);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('rejects with LocalessApiError on a non-2xx response, with a 404 hint and redacted url', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('Not Found', { status: 404, statusText: 'Not Found' }));
      const client = localessClient(baseOptions);

      const error = await client.getContentBySlug('missing').catch(e => e);

      expect(error).toBeInstanceOf(LocalessApiError);
      expect(error.status).toBe(404);
      expect(error.hint).toContain('Resource not found');
      expect(error.url).not.toContain('token-123');
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

    it('builds the URL with the resolveAsset param', async () => {
      (fetch as any).mockResolvedValue(jsonResponse({ _id: 'c1' }));
      const client = localessClient(baseOptions);

      await client.getContentById('c1', { resolveAsset: true });

      expect(fetch).toHaveBeenCalledWith(
        'https://cms.example.com/api/v1/spaces/space-1/contents/c1?token=token-123&resolveAsset=true',
        expect.any(Object)
      );
    });

    it('rejects with LocalessApiError on a non-2xx response, with a 5xx hint', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockResolvedValue(new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }));
      const client = localessClient(baseOptions);

      const error = await client.getContentById('c1').catch(e => e);

      expect(error).toBeInstanceOf(LocalessApiError);
      expect(error.status).toBe(500);
      expect(error.hint).toContain('transient');
    });

    it('rejects and logs on network error, wrapped as LocalessNetworkError', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('boom'));
      const client = localessClient(baseOptions);

      const error = await client.getContentById('c1').catch(e => e);

      expect(error).toBeInstanceOf(LocalessNetworkError);
      expect(errorSpy).toHaveBeenCalled();
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

    it('rejects and logs on network error, wrapped as LocalessNetworkError', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('boom'));
      const client = localessClient(baseOptions);

      const error = await client.getTranslations('en').catch(e => e);

      expect(error).toBeInstanceOf(LocalessNetworkError);
      expect(error.url).not.toContain('token-123');
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
