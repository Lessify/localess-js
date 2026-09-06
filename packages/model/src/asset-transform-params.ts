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
   * Combined with `h`, the result is governed by `fit` — which defaults to a
   * cover crop filling the exact box.
   */
  w?: number;
  /**
   * Target height in pixels (integer > 0).
   * Scales to height with width auto when `w` is omitted (aspect ratio preserved).
   * Combined with `w`, the result is governed by `fit` — which defaults to a
   * cover crop filling the exact box.
   */
  h?: number;
  /**
   * Output quality, 1–100. Default: 85.
   * Applies to JPEG, WebP, AVIF. Ignored for PNG.
   */
  q?: number;
  /**
   * Output format. Converts the image to the specified format.
   *
   * An unrecognised value is rejected by the API with `400`.
   */
  f?: 'webp' | 'jpeg' | 'png' | 'avif';
  /**
   * How the image is fitted when **both** `w` and `h` are given. Ignored otherwise,
   * since a single dimension always preserves the aspect ratio.
   *
   * - `cover` — fill the box and crop the overflow (the API default)
   * - `contain` — fit inside the box and pad to the exact box size
   * - `inside` — shrink to fit inside the box, no pad, no crop; output may be
   *   smaller than the box. **Usually what you want for a CMS thumbnail.**
   * - `outside` — cover the box without cropping; output may be larger than the box
   * - `fill` — stretch to the exact box; aspect ratio is not preserved
   *
   * Left unset the API default (`cover`) applies, so existing URLs are unchanged.
   * An unrecognised value is rejected by the API with `400`.
   *
   * Requires a Localess deployment with asset `fit` support; older deployments
   * ignore the parameter.
   */
  fit?: 'cover' | 'contain' | 'inside' | 'outside' | 'fill';
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
