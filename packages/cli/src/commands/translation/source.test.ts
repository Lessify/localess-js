import { describe, expect, it, vi } from 'vitest';

import type { LocalessCliClient } from '../../client';
import { LocalessApiError } from '../../models';
import { explainRawUnsupported, fetchTranslations, findUnknownLocale, resolveTranslationSource } from './source';

function client(overrides: Partial<Record<keyof LocalessCliClient, unknown>>): LocalessCliClient {
  return overrides as unknown as LocalessCliClient;
}

describe('resolveTranslationSource', () => {
  it('maps flags to sources', () => {
    expect(resolveTranslationSource({})).toBe('published');
    expect(resolveTranslationSource({ draft: true })).toBe('draft');
    expect(resolveTranslationSource({ raw: true })).toBe('raw');
  });

  it('rejects --raw with --draft', () => {
    expect(() => resolveTranslationSource({ raw: true, draft: true })).toThrow('--raw and --draft cannot be combined');
  });
});

describe('fetchTranslations', () => {
  it('reads published, draft and stored values from the matching endpoint', async () => {
    const getTranslations = vi.fn().mockResolvedValue({ a: 'A' });
    const getTranslationValues = vi.fn().mockResolvedValue({ b: 'B' });
    const c = client({ getTranslations, getTranslationValues });

    await fetchTranslations(c, 'de', 'published');
    await fetchTranslations(c, 'de', 'draft');
    await expect(fetchTranslations(c, 'de', 'raw')).resolves.toEqual({ b: 'B' });

    expect(getTranslations).toHaveBeenNthCalledWith(1, 'de', { version: undefined });
    expect(getTranslations).toHaveBeenNthCalledWith(2, 'de', { version: 'draft' });
    expect(getTranslationValues).toHaveBeenCalledWith('de');
  });
});

describe('findUnknownLocale', () => {
  it('returns the space locales when the locale is not one of them', async () => {
    const c = client({ getSpace: vi.fn().mockResolvedValue({ locales: [{ id: 'en' }, { id: 'de' }] }) });
    await expect(findUnknownLocale(c, 'dee')).resolves.toEqual(['en', 'de']);
    await expect(findUnknownLocale(c, 'de')).resolves.toBeUndefined();
  });

  it('skips the check when the space reports no locales, rather than refusing every locale', async () => {
    await expect(findUnknownLocale(client({ getSpace: vi.fn().mockResolvedValue({}) }), 'de')).resolves.toBeUndefined();
    await expect(findUnknownLocale(client({ getSpace: vi.fn().mockResolvedValue({ locales: [] }) }), 'de')).resolves.toBeUndefined();
  });

  it('reads the space silently and skips the check when the token cannot', async () => {
    const getSpace = vi.fn().mockRejectedValue(new LocalessApiError(403, 'Forbidden', 'url', undefined, 'hint'));
    await expect(findUnknownLocale(client({ getSpace }), 'de')).resolves.toBeUndefined();
    expect(getSpace).toHaveBeenCalledWith({ silent: true });
  });
});

describe('explainRawUnsupported', () => {
  it('explains a 404 on --raw as a platform too old', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    explainRawUnsupported(new LocalessApiError(404, 'Not Found', 'url', undefined, 'hint'), 'raw');
    explainRawUnsupported(new LocalessApiError(404, 'Not Found', 'url', undefined, 'hint'), 'published');
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('newer than 4.0.0'));
    error.mockRestore();
  });
});
