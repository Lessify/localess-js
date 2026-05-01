import type { ContentLink, Links } from '../models';

/**
 * Resolves a {@link ContentLink} reference to a navigable URL string.
 *
 * Resolution rules by `link.type`:
 * - `'content'` — looks up `link.uri` in the `links` map and returns `'/' + fullSlug`.
 *   Returns `'/not-found'` when `links` is undefined or the URI is not in the map.
 * - `'url'`     — returns `link.uri` directly (external or absolute URL).
 * - anything else — returns `'no-type'` (indicates a misconfigured link field).
 *
 * @param links - The links map from `content.links` (keyed by link URI). May be `undefined`.
 * @param link  - The content link reference to resolve.
 * @returns A URL string ready to use in an `<a href>` or Next.js `<Link href>`.
 *
 * @example
 * ```tsx
 * import { findLink } from '@localess/react';
 *
 * function NavItem({ data, links }) {
 *   return <a href={findLink(links, data.url)}>{data.label}</a>;
 * }
 * ```
 */
export function findLink(links: Links | undefined, link: ContentLink): string {
  switch (link.type) {
    case 'content': {
      if (links) {
        const path = links[link.uri];
        if (path) {
          return '/' + path.fullSlug;
        } else {
          return '/not-found';
        }
      }
      return '/not-found';
    }
    case 'url':
      return link.uri;
    default:
      return 'no-type';
  }
}
