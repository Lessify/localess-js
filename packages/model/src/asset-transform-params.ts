/**
 * Optional image transform parameters for asset URL generation.
 * Appended as query parameters to the asset URL.
 *
 * @see https://docs.localess.io (Localess API — Asset Query Parameters)
 */
export type AssetTransformParams = {
  /**
   * Target width in pixels (integer > 0).
   * Scales to width with height auto when `h` is omitted (aspect ratio preserved).
   * Combined with `h`, produces a cover crop to fill the exact box.
   */
  w?: number;
  /**
   * Target height in pixels (integer > 0).
   * Scales to height with width auto when `w` is omitted (aspect ratio preserved).
   * Combined with `w`, produces a cover crop to fill the exact box.
   */
  h?: number;
  /**
   * Output quality, 1–100. Default: 85.
   * Applies to JPEG, WebP, AVIF. Ignored for PNG.
   */
  q?: number;
  /**
   * Output format. Converts the image to the specified format.
   */
  f?: 'webp' | 'jpeg' | 'png' | 'avif';
  /**
   * When true, sets Content-Disposition to `form-data`, forcing a browser download.
   */
  download?: boolean;
  /**
   * When true, extracts the first frame of animated WebP/GIF before resizing.
   * For video with `w`, extracts a frame via FFmpeg then resizes with Sharp (output defaults to webp).
   */
  thumbnail?: boolean;
};
