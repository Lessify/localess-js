import { describe, expect, it } from 'vitest';

import { buildAssetQueryString } from './asset.util';

describe('buildAssetQueryString', () => {
  it('returns empty string when params is undefined', () => {
    expect(buildAssetQueryString(undefined)).toBe('');
  });

  it('returns empty string when params is empty object', () => {
    expect(buildAssetQueryString({})).toBe('');
  });

  it('serialises w param', () => {
    expect(buildAssetQueryString({ w: 800 })).toBe('w=800');
  });

  it('serialises h param', () => {
    expect(buildAssetQueryString({ h: 600 })).toBe('h=600');
  });

  it('serialises q param', () => {
    expect(buildAssetQueryString({ q: 90 })).toBe('q=90');
  });

  it('serialises f param', () => {
    expect(buildAssetQueryString({ f: 'webp' })).toBe('f=webp');
  });

  // These two params are presence flags in the Localess API, not values: `?download` with no
  // value is the canonical form and is what the Localess UI links to. Emitting `=true` would also
  // be accepted by the API, but it is not the form to standardise on.
  it('serialises download as a valueless flag', () => {
    expect(buildAssetQueryString({ download: true })).toBe('download');
  });

  it('omits download when false', () => {
    expect(buildAssetQueryString({ download: false })).toBe('');
  });

  it('serialises thumbnail as a valueless flag', () => {
    expect(buildAssetQueryString({ thumbnail: true })).toBe('thumbnail');
  });

  it('omits thumbnail when false', () => {
    expect(buildAssetQueryString({ thumbnail: false })).toBe('');
  });

  it('serialises all params combined in correct order', () => {
    expect(buildAssetQueryString({ w: 800, h: 600, q: 90, f: 'webp', download: true, thumbnail: true })).toBe(
      'w=800&h=600&q=90&f=webp&download&thumbnail'
    );
  });

  it('omits undefined params', () => {
    expect(buildAssetQueryString({ w: 400, f: 'avif' })).toBe('w=400&f=avif');
  });
});

describe('buildAssetQueryString — fit', () => {
  it.each(['cover', 'contain', 'inside', 'outside', 'fill'] as const)('serialises fit=%s', fit => {
    expect(buildAssetQueryString({ fit })).toBe(`fit=${fit}`);
  });

  it('omits fit when absent — the API default applies', () => {
    expect(buildAssetQueryString({ w: 400, h: 300 })).toBe('w=400&h=300');
  });

  it('applies no client-side default for fit', () => {
    expect(buildAssetQueryString({ w: 400, h: 300 })).not.toContain('fit');
  });

  it('places fit after f and before the flags', () => {
    expect(buildAssetQueryString({ w: 400, h: 300, q: 80, f: 'webp', fit: 'inside', download: true, thumbnail: true })).toBe(
      'w=400&h=300&q=80&f=webp&fit=inside&download&thumbnail'
    );
  });
});

describe('buildAssetQueryString — encoding and back-compat', () => {
  it('produces the same string as before this change for the common case', () => {
    expect(buildAssetQueryString({ w: 400, h: 300, q: 80, f: 'webp' })).toBe('w=400&h=300&q=80&f=webp');
  });

  it('URI-encodes values', () => {
    expect(buildAssetQueryString({ f: 'a b&c=d' as never })).toBe('f=a%20b%26c%3Dd');
  });

  it('leaves values needing no encoding untouched', () => {
    expect(buildAssetQueryString({ w: 1200, f: 'jpeg', fit: 'outside' })).toBe('w=1200&f=jpeg&fit=outside');
  });

  it('keeps the boolean flags valueless', () => {
    expect(buildAssetQueryString({ download: true, thumbnail: true })).toBe('download&thumbnail');
  });
});
