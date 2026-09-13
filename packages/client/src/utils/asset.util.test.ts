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

describe('buildAssetQueryString — rejects values the API would 400 on', () => {
  // The platform rejects malformed numerics with a 400 that is cached for an hour, so a
  // placeholder leaking into a URL fails in production rather than at the call site.
  // NaN is a `number` to TypeScript, so the compiler cannot catch this on its own.

  describe('dimensions must be a positive, finite number', () => {
    it.each([
      ['w', NaN],
      ['w', Infinity],
      ['w', -Infinity],
      ['h', NaN],
    ])('throws for %s=%s', (param, value) => {
      expect(() => buildAssetQueryString({ [param]: value })).toThrow(TypeError);
    });

    it.each([
      ['w', 0],
      ['w', -5],
      ['h', 0],
      ['h', -5],
    ])('throws for a non-positive %s=%s', (param, value) => {
      expect(() => buildAssetQueryString({ [param]: value })).toThrow(TypeError);
    });

    it('throws for a fraction, which would be a duplicate cache key', () => {
      expect(() => buildAssetQueryString({ w: 0.5 })).toThrow(TypeError);
    });

    it('names the parameter and the offending value', () => {
      expect(() => buildAssetQueryString({ w: NaN })).toThrow(/w/);
      expect(() => buildAssetQueryString({ w: NaN })).toThrow(/NaN/);
    });

    it('rejects null slipping through from plain JS', () => {
      expect(() => buildAssetQueryString({ w: null as unknown as number })).toThrow(TypeError);
    });

    it('rejects a string slipping through from plain JS', () => {
      expect(() => buildAssetQueryString({ w: '800' as unknown as number })).toThrow(TypeError);
    });
  });

  describe('quality must be a finite number within 1-100', () => {
    it('throws for a non-finite q', () => {
      expect(() => buildAssetQueryString({ q: NaN })).toThrow(TypeError);
    });

    it.each([[150], [101], [0], [-10]])('throws for an out-of-range q=%i', value => {
      // The API would clamp these rather than reject them, so they would "work" — but
      // honouring a value the documented range excludes hides a caller bug.
      expect(() => buildAssetQueryString({ q: value })).toThrow(TypeError);
    });

    it('names the accepted range in the message', () => {
      expect(() => buildAssetQueryString({ q: 150 })).toThrow(/between 1 and 100/);
    });

    it.each([[1], [50], [100]])('allows q=%i at and inside the bounds', value => {
      expect(buildAssetQueryString({ q: value })).toBe(`q=${value}`);
    });

    it('throws for a decimal q, which encodes the same as its integer', () => {
      expect(() => buildAssetQueryString({ q: 100.9 })).toThrow(TypeError);
    });
  });

  describe('fractions are rejected because each one is a separate cache key', () => {
    it.each([[50.0], [50.1], [50.5], [50.9]])('q=%s encodes identically to 50 but is a distinct URL', value => {
      // 50.0 is `50` in JS and passes; the rest must not reach the CDN as extra entries.
      if (Number.isInteger(value)) {
        expect(() => buildAssetQueryString({ q: value })).not.toThrow();
      } else {
        expect(() => buildAssetQueryString({ q: value })).toThrow(/whole number/);
      }
    });

    it.each([[400.9], [400.1], [0.5]])('w=%s resizes identically to its integer but is a distinct URL', value => {
      expect(() => buildAssetQueryString({ w: value })).toThrow(/whole number/);
    });

    it('is the common DPR case — a width times a fractional device pixel ratio', () => {
      const cssWidth = 320;
      const dpr = 1.5;

      expect(() => buildAssetQueryString({ w: cssWidth * dpr })).not.toThrow();
      expect(() => buildAssetQueryString({ w: 333 * dpr })).toThrow(/whole number/);
    });
  });

  describe('valid input is untouched', () => {
    it('allows a whole-number w', () => {
      expect(buildAssetQueryString({ w: 400 })).toBe('w=400');
    });

    it('treats an undefined param as omitted rather than invalid', () => {
      expect(buildAssetQueryString({ w: undefined, h: 600 })).toBe('h=600');
    });

    it('leaves a fully valid query unchanged', () => {
      expect(buildAssetQueryString({ w: 800, h: 600, q: 90, f: 'webp', fit: 'inside', download: true })).toBe(
        'w=800&h=600&q=90&f=webp&fit=inside&download'
      );
    });
  });
});

describe('buildAssetQueryString — the dimension ceiling', () => {
  it('accepts a width at the ceiling', () => {
    expect(buildAssetQueryString({ w: 8192 })).toBe('w=8192');
  });

  it.each([[8193], [50000]])('throws for w=%i, above the ceiling', value => {
    expect(() => buildAssetQueryString({ w: value })).toThrow(/between 1 and 8192/);
  });

  it('throws for an oversized h', () => {
    expect(() => buildAssetQueryString({ h: 9000 })).toThrow(/between 1 and 8192/);
  });

  it('allows a width far above any plausible source, because upscaling is honoured', () => {
    // The ceiling bounds the decoded bitmap, not the source image. 3840 from a 500px original
    // is a legitimate upscale request, not something to silently reduce.
    expect(buildAssetQueryString({ w: 3840 })).toBe('w=3840');
  });
});
