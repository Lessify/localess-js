/**
 * What a request is fetching, for cache-tag generation.
 */
export type LocalessCacheTarget =
  { kind: 'links' } | { kind: 'content'; id: string } | { kind: 'slug'; slug: string } | { kind: 'translations'; locale: string };

/** Tag matching every Localess request, for a blunt "invalidate everything". */
export const LOCALESS_CACHE_TAG = 'localess';

/**
 * Cache tags for a request, from broadest to narrowest.
 *
 * The convention is stable and part of the public contract, because webhook-driven revalidation
 * has to produce the same strings from the other direction — a handler receiving
 * `content.published` invalidates `localess:content:<id>` and expects it to match what the fetch
 * was tagged with.
 *
 * ```
 * localess                            every request
 * localess:space:<spaceId>            everything in one space
 * localess:links                      the link tree
 * localess:content:<contentId>        one document by id
 * localess:slug:<fullSlug>            one document by slug
 * localess:translations:<locale>      one locale's translations
 * ```
 *
 * @param spaceId the space being fetched from
 * @param target what the request is fetching
 * @returns the tags to attach, broadest first
 */
export function localessCacheTags(spaceId: string, target: LocalessCacheTarget): string[] {
  const tags = [LOCALESS_CACHE_TAG, `${LOCALESS_CACHE_TAG}:space:${spaceId}`];
  switch (target.kind) {
    case 'links':
      tags.push(`${LOCALESS_CACHE_TAG}:links`);
      break;
    case 'content':
      tags.push(`${LOCALESS_CACHE_TAG}:content:${target.id}`);
      break;
    case 'slug':
      tags.push(`${LOCALESS_CACHE_TAG}:slug:${target.slug}`);
      break;
    case 'translations':
      tags.push(`${LOCALESS_CACHE_TAG}:translations:${target.locale}`);
      break;
  }
  return tags;
}
