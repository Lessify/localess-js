/**
 * Structural copies of @localess/client's content value types, declared locally so this
 * package stays dependency-free (see ADR 007/008). A type test asserts mutual assignability
 * with the client's originals — change them together.
 */

/**
 * Reference to an Asset — structurally identical to @localess/client's ContentAsset.
 */
export interface SchemaContentAsset {
  /**
   * Define the type of Asset
   */
  kind: 'ASSET';

  /**
   * Unique identifier for the asset.
   */
  uri: string;
}

/**
 * Reference to a Link — structurally identical to @localess/client's ContentLink.
 */
export interface SchemaContentLink {
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

/**
 * Reference to a Content — structurally identical to @localess/client's ContentReference.
 */
export interface SchemaContentReference {
  /**
   * Define the type of REFERENCE
   */
  kind: 'REFERENCE';

  /**
   * Unique identifier for the Content Document.
   */
  uri: string;
}

/**
 * Rich text content node — structurally identical to @localess/client's ContentRichText.
 */
export interface SchemaContentRichText {
  /**
   * Define the type of Content Node
   */
  type?: string;

  /**
   * List of Content Nodes
   */
  content?: SchemaContentRichText[];
}
