import { describe, expect, it } from 'vitest';
import { resolveLocaleAndSlug, segmentsFromUrl } from './route';

describe('segmentsFromUrl', () => {
  it('splits a path into segments', () => {
    expect(segmentsFromUrl('/de/home')).toEqual(['de', 'home']);
  });

  it('drops the query string and empty segments', () => {
    expect(segmentsFromUrl('/fr/blog/post/?preview=1')).toEqual(['fr', 'blog', 'post']);
  });

  it('returns no segments for the root url', () => {
    expect(segmentsFromUrl('/')).toEqual([]);
  });
});

describe('resolveLocaleAndSlug', () => {
  it('treats a known first segment as the locale', () => {
    expect(resolveLocaleAndSlug(['de', 'home'])).toEqual({ locale: 'de', slug: 'home' });
  });

  it('treats an unknown first segment as part of the slug', () => {
    expect(resolveLocaleAndSlug(['blog', 'post'])).toEqual({ locale: undefined, slug: 'blog/post' });
  });

  it('falls back to the home slug for a bare locale root', () => {
    expect(resolveLocaleAndSlug(['ru'])).toEqual({ locale: 'ru', slug: 'home' });
  });

  it('falls back to the home slug for the site root', () => {
    expect(resolveLocaleAndSlug([])).toEqual({ locale: undefined, slug: 'home' });
  });
});
