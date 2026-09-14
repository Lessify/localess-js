/**
 * Optional image transform parameters for asset URL generation.
 * Appended as query parameters to the asset URL.
 *
 * ## Nothing is converted implicitly
 *
 * **`f` is the only thing that changes an image's format.** A URL built without it returns
 * the format that was uploaded.
 *
 * **Passing `f` is how you cut transfer size**, opt-in rather than imposed because a format
 * change is the developer's call. How much it saves is **content-dependent**, and more so since
 * JPEG output uses mozjpeg. Measured against mozjpeg JPEG at the same default quality:
 * a smooth photographic source gave `webp` −20% and `avif` −63%; a grainy one gave `webp`
 * **+84%** and `avif` −37%.
 *
 * So `avif` is consistently smaller (at ~2.5x the encode time), while **`webp` can be larger
 * than the JPEG it replaces** on noisy or textured content. Measure your own assets rather than
 * assuming the usual "WebP is 25–35% smaller" figure holds.
 *
 * ## Quality is normalised, though
 *
 * A still raster is **re-encoded at its format's default quality even with no parameters**, so a
 * bare `assetLink(asset)` returns a *rendition*, not the uploaded file — a q95 camera export
 * measured 587 KB and came back 219 KB. Animations, GIF, SVG and video are served as stored.
 *
 * For the uploaded bytes untouched use `assetOriginalLink`; to force a browser download instead
 * of displaying it, use `assetDownloadLink`.
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
   * **A width above the source size redirects, it does not upscale.** `w=5000` against a
   * 400 px asset responds `302` to `?w=400`. Browsers follow this transparently, so `srcset`
   * ladders that walk past a small source keep working — they just converge on one URL.
   * An asset with no recorded dimensions is served as requested, since the source size is
   * unknown.
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
   * **Redirects rather than upscaling** above the source height, and **must be a whole number
   * between 1 and 8192**, on the same terms as `w`.
   *
   * When both `w` and `h` exceed the source, the *box* is shrunk proportionally rather than
   * each axis capped independently — so a square box stays square and `fit` still means what
   * it meant.
   */
  h?: number;
  /**
   * Output quality, 1–100.
   *
   * **Omit it and each encoder applies its own default** — JPEG and WebP 80, AVIF 50; PNG is
   * lossless and ignores it entirely. The API deliberately imposes no single number, because
   * a quality value is not portable between codecs: AVIF is quantizer-based and sits on a
   * different perceptual curve, so 50 there is roughly what 80 is for JPEG. Forcing 80 onto
   * AVIF produces a file several times larger than its own default, and larger than the
   * equivalent WebP.
   *
   * An explicit value always wins, for every format.
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
   * **Nothing is converted without this parameter** — omit it and the stored format is kept.
   * Passing it is how you cut transfer size, but how much depends on the content: `avif` is
   * consistently smaller, while `webp` can be *larger* than the mozjpeg JPEG it replaces on
   * grainy sources. See the type-level docs above for measurements.
   *
   * Every value **encodes**: `f: 'jpeg'` on a JPEG source still re-encodes, at `q`.
   *
   * A resize without `f` re-encodes in the *source* format, so `{ w: 400 }` on a JPEG returns a
   * 400 px JPEG — the size changes, the format does not. For the stored bytes with no re-encode
   * at all, use `assetOriginalLink`.
   *
   * Requesting a *lossless* format the source already is (`f: 'png'` on a PNG) is served as
   * a passthrough, since the re-encode would produce equivalent bytes.
   *
   * An unrecognised value is rejected by the API with `400`. `f: 'original'` was removed in
   * v4 and is now rejected — use `assetOriginalLink`.
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
   * When true, extracts the first frame of animated WebP/GIF before resizing.
   * For video with `w`, extracts a frame via FFmpeg then resizes with Sharp (output defaults to webp).
   */
  thumbnail?: boolean;
};
