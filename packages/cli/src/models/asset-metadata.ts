/**
 * Resolved Asset metadata returned when resolveAsset=true.
 */
export interface AssetMetadata {
  /**
   * Unique identifier for the Asset.
   */
  id: string;

  /**
   * Name of the Asset.
   * @example hero-image
   */
  name: string;

  /**
   * File extension of the Asset.
   * @example .jpg
   */
  extension: string;

  /**
   * MIME type of the Asset.
   * @example image/jpeg
   */
  type: string;

  /**
   * Alternative text for the Asset.
   * @example A hero image
   */
  alt?: string;
}
