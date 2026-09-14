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

  /**
   * Rendered width in pixels, with EXIF orientation already applied.
   *
   * Present for images whose dimensions were recorded at upload. Use it with {@link height} to
   * reserve the layout box before the image loads, rather than paying a request to find out how
   * big it is.
   *
   * @example
   * ```tsx
   * <img src={assetLink(asset, { w: 800 })} width={meta.width} height={meta.height} alt={meta.alt} />
   * ```
   */
  width?: number;

  /**
   * Rendered height in pixels, with EXIF orientation already applied.
   * @example 1200
   */
  height?: number;

  /**
   * File size in bytes.
   *
   * The one field here you cannot derive from any other, and the one a download affordance needs.
   *
   * @example
   * ```tsx
   * <a href={assetDownloadLink(asset)}>
   *   {meta.name} — {meta.extension.slice(1).toUpperCase()}, {(meta.size / 1024 / 1024).toFixed(1)} MB
   * </a>
   * ```
   */
  size: number;

  /**
   * Playback length in **whole seconds**, for video and animated images.
   *
   * Lets a video card render `3:42` without fetching the file. Normalised by the API, so it is
   * always a number even for assets whose metadata predates that normalisation.
   * @example 65
   */
  duration?: number;
}
