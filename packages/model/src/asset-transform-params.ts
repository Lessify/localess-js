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
   * **Upscaling is allowed.** A width above the source dimensions is honoured, not silently
   * reduced — asking for `w=3840` from a 500 px source returns a 3840 px render. Two different
   * widths therefore always mean two genuinely different responses.
   *
   * **Must be a whole number between 1 and 8192.** `w=abc`, `w=undefined` (a stringified
   * `undefined` from a template), `w=0`, `w=-5`, `w=400.9` and `w=50000` all fail with `400`,
   * and that `400` is cached for an hour. An empty value (`w=`) counts as omitted. The 8192
   * ceiling bounds the decoded bitmap the API must hold; it is not a limit on the source.
   *
   * **Round any computed width.** A CSS width times a fractional device pixel ratio —
   * `320 * 1.5` is fine, `333 * 1.5` is `499.5` — is the usual source of a fraction here.
   * Each distinct spelling is a separate CDN cache key for identical output, so
   * `Math.round()` before passing it.
   */
  w?: number;
  /**
   * Target height in pixels (integer > 0).
   * Scales to height with width auto when `w` is omitted (aspect ratio preserved).
   * Combined with `w`, the result is governed by `fit` — which defaults to a
   * cover crop filling the exact box.
   *
   * **Upscaling is allowed**, and the value **must be a whole number between 1 and 8192**, on
   * the same terms as `w`.
   */
  h?: number;
  /**
   * Output quality, 1–100. Default: 80.
   * Applies to JPEG, WebP, AVIF. Ignored for PNG.
   *
   * **Must be a whole number within 1–100.** A fraction or an out-of-range value throws a
   * `TypeError` from `buildAssetQueryString` before the URL is built, and returns `400` from
   * the API for a URL constructed by hand.
   *
   * Fractions are rejected rather than truncated because each one is a **separate cache
   * key for identical output**: `q: 50`, `q: 50.1` and `q: 50.5` all encode at quality 50,
   * so accepting them multiplies CDN entries and re-runs the image pipeline for the same
   * bytes. Round before passing a computed value.
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
   * When true, sets `Content-Disposition: attachment`, forcing a browser download.
   *
   * A non-ASCII asset name is carried in an RFC 5987 `filename*` parameter, with an
   * ASCII-safe `filename` fallback for clients that do not understand it — so an asset named
   * in Cyrillic or CJK downloads under its real name rather than a percent-escaped one.
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
