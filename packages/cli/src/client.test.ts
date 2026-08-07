import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localessCliClient } from './client';

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('localessCliClient', () => {
  const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123', retryDelay: 0 };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes a trailing slash off the origin when building request URLs', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({ id: 'space-1', name: 'Demo' })));
    const client = localessCliClient({ ...baseOptions, origin: 'https://cms.example.com/' });

    await client.getSpace();

    expect(fetch).toHaveBeenCalledWith('https://cms.example.com/api/v1/spaces/space-1?token=token-123', expect.anything());
  });

  it('getSpace returns the parsed space on success', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({ id: 'space-1', name: 'Demo Space' })));
    const client = localessCliClient(baseOptions);

    const space = await client.getSpace();

    expect(space).toEqual({ id: 'space-1', name: 'Demo Space' });
  });

  it('getSpace throws when all retries are exhausted', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error('network down')));
    const client = localessCliClient({ ...baseOptions, retryCount: 1 });

    await expect(client.getSpace()).rejects.toThrow('network down');
    expect(fetch).toHaveBeenCalledTimes(2); // initial attempt + 1 retry
  });

  it('getSchemas retries on a 5xx response and succeeds once the server recovers', async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => Promise.resolve(jsonResponse({}, { ok: false, status: 503 })))
      .mockImplementationOnce(() => Promise.resolve(jsonResponse({ schemas: [] })));
    const client = localessCliClient({ ...baseOptions, retryCount: 2 });

    const schemas = await client.getSchemas();

    expect(schemas).toEqual({ schemas: [] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('getSchemas throws when the server keeps returning 5xx', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({}, { ok: false, status: 500 })));
    const client = localessCliClient({ ...baseOptions, retryCount: 1 });

    await expect(client.getSchemas()).rejects.toThrow('HTTP 500');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a 4xx response, treating it as a resolved (non-retryable) response', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({ message: 'not found' }, { ok: false, status: 404 })));
    const client = localessCliClient({ ...baseOptions, retryCount: 3 });

    const schemas = await client.getSchemas();

    expect(schemas).toEqual({ message: 'not found' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('getOpenApi returns the parsed OpenAPI document on success', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({ openapi: '3.0.0' })));
    const client = localessCliClient(baseOptions);

    const openApi = await client.getOpenApi();

    expect(openApi).toEqual({ openapi: '3.0.0' });
    expect(fetch).toHaveBeenCalledWith('https://cms.example.com/api/v1/spaces/space-1/open-api?token=token-123', expect.anything());
  });

  it('updateTranslations sends a POST request with the X-API-KEY header and body', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({ message: 'Updated 1 translation', ids: ['1'] })));
    const client = localessCliClient(baseOptions);

    const response = await client.updateTranslations('en', 'add-missing' as never, { 'nav.home': 'Home' }, true);

    expect(response).toEqual({ message: 'Updated 1 translation', ids: ['1'] });
    expect(fetch).toHaveBeenCalledWith(
      'https://cms.example.com/api/v1/spaces/space-1/translations/en',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-KEY': 'token-123' }),
        body: JSON.stringify({ type: 'add-missing', values: { 'nav.home': 'Home' }, dryRun: true }),
      })
    );
  });

  it('updateTranslations throws when the request ultimately fails', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error('network down')));
    const client = localessCliClient({ ...baseOptions, retryCount: 0 });

    await expect(client.updateTranslations('en', 'add-missing' as never, {})).rejects.toThrow('network down');
  });

  it('logs debug information for requests and responses when debug is enabled', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse({ id: 'space-1', name: 'Demo' })));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const client = localessCliClient({ ...baseOptions, debug: true });

    await client.getSpace();

    expect(logSpy).toHaveBeenCalled();
  });
});
