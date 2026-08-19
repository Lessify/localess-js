import { describe, expect, it } from 'vitest';

import { normalizePath } from './normalize-path';

describe('normalizePath', () => {
  it('adds a single leading slash', () => {
    expect(normalizePath('src')).toBe('/src');
  });

  it('strips a trailing slash', () => {
    expect(normalizePath('/src/components/')).toBe('/src/components');
  });

  it('collapses duplicate internal slashes', () => {
    expect(normalizePath('/src//components///localess')).toBe('/src/components/localess');
  });

  it('collapses duplicate leading slashes to one', () => {
    expect(normalizePath('//src')).toBe('/src');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizePath('  src/components  ')).toBe('/src/components');
  });
});
