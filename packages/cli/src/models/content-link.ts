/**
 * Content Link define reference to a Link.
 */
export interface ContentLink {

  /**
   * Define the type of Link
   */
  kind: 'LINK';

  /**
   * Define the target of the link. _blank for the new tab and _self for the same tab.
   */
  target: '_blank' | '_self';

  /**
   * Define the type of Link. URL for external links and Content for internal links.
   */
  type: 'url' | 'content';

  /**
   * If the type is content, then it will be Content ID. Otherwise, it will be URL.
   */
  uri: string;
}
