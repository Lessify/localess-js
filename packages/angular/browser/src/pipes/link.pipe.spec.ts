import { LinkPipe } from './link.pipe';
import type { ContentLink, Links } from '../models';

describe('LinkPipe', () => {
  it('delegates to findLink to resolve a content link', () => {
    const pipe = new LinkPipe();
    const links: Links = { 'content-1': { fullSlug: 'about-us' } as any };
    const link: ContentLink = { type: 'content', uri: 'content-1' } as ContentLink;

    expect(pipe.transform(links, link)).toBe('/about-us');
  });

  it('resolves a url link to its uri', () => {
    const pipe = new LinkPipe();
    const link: ContentLink = { type: 'url', uri: 'https://example.com' } as ContentLink;

    expect(pipe.transform({} as Links, link)).toBe('https://example.com');
  });
});
