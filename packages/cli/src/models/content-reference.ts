/**
 * Content Reference defines reference to a Content.
 */
export interface ContentReference {

  /**
   * Define the type of REFERENCE
   */
  kind: 'REFERENCE';

  /**
   * Unique identifier for the Content Document.
   */
  uri: string;
}
