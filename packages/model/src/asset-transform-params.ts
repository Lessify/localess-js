/**
 * Optional image transform parameters for asset URL generation.
 * Appended as query parameters to the asset URL.
 *
 * ## Default output format
 *
 * **`image/jpeg` sources are re-encoded to WebP by default** — including asset URLs built
 * with no parameters at all. A bare `assetUrl(asset)` on a JPEG therefore responds with
 * `Content-Type: image/webp`. All other source types (PNG, GIF, animated WebP, SVG, video)
 * keep their stored format.
 *
 * Pass `f: 'original'` for the stored bytes untouched, or `f: 'jpeg'` for a JPEG re-encode
 * when the client cannot render WebP.
 *
 * @see https://docs.localess.io (Localess API — Asset Query Parameters)
 */
export type AssetTransformParams = {
  /**
   * Target width in pixels (integer > 0).
   * Scales to width with height auto when `h` is omitted (aspect ratio preserved).
   * Combined with `h`, the result is governed by `fit` — which defaults to a
   * cover crop filling the exact box.
   *
   * **Never upscales.** Clamped to the source image's own width and to a hard ceiling of
   * 4096 px. A value above either bound is clamped rather than rejected, so a responsive
   * `srcset` may safely walk past the source size — the response is the source size, not an
   * inflated render of it.
   */
  w?: number;
  /**
   * Target height in pixels (integer > 0).
   * Scales to height with width auto when `w` is omitted (aspect ratio preserved).
   * Combined with `w`, the result is governed by `fit` — which defaults to a
   * cover crop filling the exact box.
   *
   * **Never upscales.** Clamped to the source image's own height and to a hard ceiling of
   * 4096 px, on the same terms as `w`.
   */
  h?: number;
  /**
   * Output quality, 1–100. Default: 80.
   * Applies to JPEG, WebP, AVIF. Ignored for PNG.
   */
  q?: number;
  /**
   * Output format. Converts the image to the specified format.
   *
   * Defaults to `webp` for `image/jpeg` sources; every other source type keeps its stored
   * format. The values differ in kind:
   *
   * - `webp` / `jpeg` / `png` / `avif` — **encode** to that format. `f: 'jpeg'` on a JPEG
   *   source still re-encodes, at `q`, which is the point: it is the escape hatch for
   *   clients that cannot render WebP and it stays compressed.
   * - `original` — **no encode.** Returns the stored bytes byte-for-byte, with an `inline`
   *   disposition. Use it for a full-quality lightbox, print, or downstream processing;
   *   combine with `w` to resize without converting.
   *
   * Requesting a *lossless* format the source already is (`f: 'png'` on a PNG) is served as
   * a passthrough, since the re-encode would produce equivalent bytes.
   *
   * An unrecognised value is rejected by the API with `400`.
   */
  f?: 'webp' | 'jpeg' | 'png' | 'avif' | 'original';
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
   *
   * Also opts out of the WebP default, so a download returns the file the user uploaded
   * with its original extension rather than a re-encoded copy. An explicit `f` still wins,
   * and `w`/`h` still apply — `{ w: 200, download: true }` downloads a 200 px render in the
   * source format. For the stored bytes *without* forcing a download, use `f: 'original'`.
   */
  download?: boolean;
  /**
   * When true, extracts the first frame of animated WebP/GIF before resizing.
   * For video with `w`, extracts a frame via FFmpeg then resizes with Sharp (output defaults to webp).
   */
  thumbnail?: boolean;
};
