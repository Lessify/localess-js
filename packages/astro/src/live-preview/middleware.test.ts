import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:localess-options', () => ({ default: { componentsDir: 'src', spaceId: 'space-1' } }));

const { onRequest } = await import('./middleware');

function makeContext(overrides: Partial<{ method: string; headers: Record<string, string>; body: unknown }> = {}) {
  const { method = 'POST', headers = {}, body } = overrides;
  const request = new Request('https://example.com/', {
    method,
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { request, locals: {} as Record<string, unknown> };
}

describe('onRequest', () => {
  const next = vi.fn().mockResolvedValue(new Response('ok'));

  it('populates locals when the request is a validated preview POST', async () => {
    const data = { _id: '1', _schema: 'page' };
    const context = makeContext({ body: { data, spaceId: 'space-1' } });

    await onRequest(context as any, next);

    expect(context.locals._localess_preview_data).toEqual({ data });
  });

  it('ignores GET requests', async () => {
    const context = makeContext({ method: 'GET' });

    await onRequest(context as any, next);

    expect(context.locals._localess_preview_data).toBeUndefined();
  });

  it('ignores a POST missing Sec-Fetch-Site: same-origin', async () => {
    const context = makeContext({ body: { data: {}, spaceId: 'space-1' }, headers: { 'sec-fetch-site': 'cross-site' } });

    await onRequest(context as any, next);

    expect(context.locals._localess_preview_data).toBeUndefined();
  });

  it('ignores a POST with a mismatched spaceId', async () => {
    const context = makeContext({ body: { data: {}, spaceId: 'wrong-space' } });

    await onRequest(context as any, next);

    expect(context.locals._localess_preview_data).toBeUndefined();
  });

  it('calls next() and returns its response regardless of validation outcome', async () => {
    const context = makeContext({ method: 'GET' });

    const response = await onRequest(context as any, next);

    expect(response).toBeInstanceOf(Response);
    expect(next).toHaveBeenCalled();
  });
});
