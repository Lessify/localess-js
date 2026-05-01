import { ContentData } from './content-data';
import { ContentMetadata } from './content-metadata';
import { Links } from './links';
import { References } from './references';

/**
 * Content defines a shared object for all possible Content Types.
 */
export interface Content<T extends ContentData = ContentData> extends ContentMetadata {
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
}
