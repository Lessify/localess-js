import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLivePayload, getLocalessClient, resolveAsset } from './helpers';

describe('getLocalessClient', () => {
  afterEach(() => {
    delete (globalThis as any).localessClientInstance;
    vi.restoreAllMocks();
  });

  it('throws when no client has been initialized', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => getLocalessClient()).toThrow('[Localess] No client found.');
  });

  it('returns the client set on globalThis by virtual:localess-init', () => {
    const fakeClient = { getContentBySlug: vi.fn() } as any;
    (globalThis as any).localessClientInstance = fakeClient;

    expect(getLocalessClient()).toBe(fakeClient);
  });
});

describe('getLivePayload', () => {
  it('returns the preview data when locals has it', async () => {
    const data = { _id: '1', _schema: 'page' };
    const result = await getLivePayload({ locals: { _localess_preview_data: { data } } });

    expect(result).toEqual({ data });
  });

  it('returns an empty object when locals has no preview data', async () => {
    const result = await getLivePayload({ locals: {} });

    expect(result).toEqual({});
  });
});

describe('resolveAsset', () => {
  afterEach(() => {
    delete (globalThis as any).localessClientInstance;
  });

  it("delegates to the client's assetLink method", () => {
    const assetLink = vi.fn().mockReturnValue('https://cms.example.com/api/v1/spaces/space-1/assets/logo.png?w=200');
    (globalThis as any).localessClientInstance = { assetLink };

    const asset = { kind: 'ASSET' as const, uri: 'logo.png' };
    const url = resolveAsset(asset, { w: 200 });

    expect(assetLink).toHaveBeenCalledWith(asset, { w: 200 });
    expect(url).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/logo.png?w=200');
  });
});
