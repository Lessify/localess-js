import { LOCALES } from './locales';

/**
 * Splits the wildcard route's path segments into an optional locale prefix and a content slug.
 * The first segment is treated as the locale only if it matches a known {@link LOCALES} id;
 * everything after (or everything, if there's no locale prefix) becomes the slug, joined back
 * with `/`. An empty remainder falls back to `'home'`.
 */
export function resolveLocaleAndSlug(segments: string[]): { locale?: string; slug: string } {
  const isLocale = segments.length > 0 && LOCALES.some(l => l.id === segments[0]);
  const locale = isLocale ? segments[0] : undefined;
  const slugSegments = isLocale ? segments.slice(1) : segments;
  return { locale, slug: slugSegments.length > 0 ? slugSegments.join('/') : 'home' };
}
