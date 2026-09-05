import { Assets } from './assets';
import { ContentData } from './content-data';
import { ContentMetadata } from './content-metadata';
import { Links } from './links';
import { References } from './references';

/**
 * Content defines a shared object for all possible Content Types.
 */
export interface Content<T extends ContentData = ContentData> extends ContentMetadata {
  /**
   * Locale this content was served at.
   *
   * This is the locale the API actually resolved to, which is not necessarily the one requested —
   * when the requested locale does not exist in the space, the API falls back to the space's
   * `localeFallback`. Read this rather than assuming the requested value came back.
   *
   * Note this is on `Content` and deliberately not on {@link ContentMetadata}: the latter types
   * {@link Links} and `getLinks()` results, which carry no locale.
   */
  locale: string;
  /**
   * Content Data
   */
  data?: T;
  /**
   * All links used in the content.
   */
  links?: Links;
  /**
   * All references used in the content.
   */
  references?: References;
  /**
   * All assets used in the content.
   */
  assets?: Assets;
}
