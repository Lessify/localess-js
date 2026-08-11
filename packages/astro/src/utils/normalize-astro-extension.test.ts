import { describe, expect, it } from 'vitest';

import { normalizeAstroExtension } from './normalize-astro-extension';

describe('normalizeAstroExtension', () => {
  it('appends .astro when missing', () => {
    expect(normalizeAstroExtension('/src/localess/Page')).toBe('/src/localess/Page.astro');
  });

  it('leaves an existing .astro extension unchanged', () => {
    expect(normalizeAstroExtension('/src/localess/Page.astro')).toBe('/src/localess/Page.astro');
  });
});
