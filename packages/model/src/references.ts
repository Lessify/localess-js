import { Content } from './content';

/**
 * Key-Value Object. Where Key is a Unique identifier for the Content object and Value is Content.
 *
 * Reference resolution is one level deep, so each entry carries its metadata, `locale` and `data`
 * but none of its own `links`/`references`/`assets` — the API strips those raw id arrays. To follow
 * a further reference, read the `uri` from the `REFERENCE` field value in `data` and look it up:
 *
 * ```ts
 * const authorId = content.data?.author?.uri;
 * const author = authorId ? content.references?.[authorId] : undefined;
 * ```
 */
export interface References {
  [key: string]: Content;
}
