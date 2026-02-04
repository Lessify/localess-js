/**
 * Content Metadata defines short information about a Content for navigation reason.
 */
export interface ContentMetadata {

  /**
   * Date and Time at which the Content was created.
   */
  createdAt: string;

  /**
   * Combination of SLUG and Parent SLUG of the Content
   */
  fullSlug: string;

  /**
   * Unique identifier for the object.
   */
  id: string;

  /**
   * Define the type of Content, whether it is a FOLDER or DOCUMENT.
   */
  kind: 'FOLDER' | 'DOCUMENT';

  /**
   * Name of the Content
   */
  name: string;

  /**
   * Parent SLUG of the Content
   */
  parentSlug: string;

  /**
   * Date and Time at which the Content was published.
   */
  publishedAt?: string;

  /**
   * SLUG of the Content
   */
  slug: string;

  /**
   * Date and Time at which the Content was updated.
   */
  updatedAt: string;
}
