import { describe, expect, it } from 'vitest';

import { normalizePath } from './normalize-path';

describe('normalizePath', () => {
  it('adds a leading slash when missing', () => {
    expect(normalizePath('components')).toBe('/components');
  });

  it('strips a trailing slash', () => {
    expect(normalizePath('/components/')).toBe('/components');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizePath('//foo//bar///baz')).toBe('/foo/bar/baz');
  });

  it('keeps root as a single slash', () => {
    expect(normalizePath('/')).toBe('/');
  });
});
