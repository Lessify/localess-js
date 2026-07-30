import { describe, expect, it } from 'vitest';

import { findLink } from './link.util';
import type { ContentLink, Links } from '../models';

describe('findLink', () => {
  const links: Links = {
    'content-1': { fullSlug: 'about-us' } as any,
  };

  it('resolves a content link to its full slug', () => {
    const link: ContentLink = { type: 'content', uri: 'content-1' } as ContentLink;
    expect(findLink(links, link)).toBe('/about-us');
  });

  it('returns /not-found when the content link is not present in links', () => {
    const link: ContentLink = { type: 'content', uri: 'missing' } as ContentLink;
    expect(findLink(links, link)).toBe('/not-found');
  });

  it('returns /not-found when links is undefined for a content link', () => {
    const link: ContentLink = { type: 'content', uri: 'content-1' } as ContentLink;
    expect(findLink(undefined, link)).toBe('/not-found');
  });

  it('returns the uri unchanged for a url link', () => {
    const link: ContentLink = { type: 'url', uri: 'https://example.com' } as ContentLink;
    expect(findLink(links, link)).toBe('https://example.com');
  });

  it('returns no-type for an unknown link type', () => {
    const link = { type: 'unknown', uri: 'x' } as unknown as ContentLink;
    expect(findLink(links, link)).toBe('no-type');
  });
});
