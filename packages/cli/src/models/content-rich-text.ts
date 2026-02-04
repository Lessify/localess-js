/**
 * Content RichText define content as JSON Object.
 */
export interface ContentRichText {

  /**
   * Define the type of Content Node
   */
  type?: string;

  /**
   * List of Content Nodes
   */
  content?: ContentRichText[];
}
