import { AssetTransformParams } from '../models';

/**
 * Largest `w`/`h` the API accepts, in pixels.
 *
 * Requests above this are rejected rather than clamped, so the limit is mirrored here to fail
 * at the call site instead of as a `400`. It bounds the decoded bitmap the API has to hold —
 * an 8192px edge is roughly 200MB of raw pixels — and is not a statement about the source
 * image: upscaling beyond the stored dimensions is allowed.
 */
const MAX_DIMENSION = 8192;

/** Encodes a value for use in the query string. */
function encode(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * Rejects a numeric parameter the API would refuse.
 *
 * The API rejects a malformed `w`/`h`/`q` with a `400` that is **cached for an hour**, so a
 * placeholder leaking into a URL — `NaN` from a failed `parseInt`, `null` from an absent CMS
 * field — surfaces as a production failure rather than at the call site. `NaN` is a `number`
 * to TypeScript, so the compiler cannot catch it; this is the only place that can.
 *
 * Throwing rather than silently dropping the parameter is deliberate: quietly omitting it
 * would re-introduce at the SDK layer exactly the leniency the API removed, hiding the bug
 * instead of reporting it.
 * Fractions are rejected rather than truncated, which is a *caching* rule more than a validation
 * one. `q: 50`, `q: 50.1` and `q: 50.5` all encode at quality 50, but produce three different URLs
 * — so three CDN cache entries, and three runs of the image pipeline, for byte-identical output.
 * One value, one URL. The API applies the same rule and answers `400`.
 * @param param Query parameter name, for the error message
 * @param value Value supplied by the caller
 * @param min Smallest value the API accepts
 * @param max Largest value the API accepts, if the parameter has an upper bound
 */
function assertNumeric(param: string, value: number, min: number, max?: number): void {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`[Localess] Invalid asset transform parameter '${param}': ${String(value)}. Expected a whole number.`);
  }
  if (value < min || (max !== undefined && value > max)) {
    const range = max !== undefined ? `between ${min} and ${max}` : `greater than or equal to ${min}`;
    throw new TypeError(`[Localess] Invalid asset transform parameter '${param}': ${value}. Expected a number ${range}.`);
  }
}

/**
 * Builds the query string for an asset URL from transform parameters.
 *
 * Emits in a fixed order (`w`, `h`, `q`, `f`, `fit`, then the flags) so URLs are
 * stable and CDN-cacheable for a given set of parameters. Absent parameters are
 * omitted rather than defaulted — the API owns the defaults, so an unset `fit`
 * leaves existing URLs byte-identical.
 *
 * @throws {TypeError} if `w`, `h` or `q` is present but not a finite number, or if `w`/`h`
 * is not greater than zero. The API rejects those with a `400` that is cached for an hour,
 * so failing here turns a production incident into a stack trace at the call site.
 */
export function buildAssetQueryString(params?: AssetTransformParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.w !== undefined) {
    assertNumeric('w', params.w, 1, MAX_DIMENSION);
    parts.push(`w=${encode(params.w)}`);
  }
  if (params.h !== undefined) {
    assertNumeric('h', params.h, 1, MAX_DIMENSION);
    parts.push(`h=${encode(params.h)}`);
  }
  if (params.q !== undefined) {
    // The API rejects an out-of-range quality with a 400 that is cached for an hour. Rejecting it
    // here too turns that cached production failure into a stack trace at the call site, and `150`
    // far more often means a caller bug than a request for maximum quality.
    assertNumeric('q', params.q, 1, 100);
    parts.push(`q=${encode(params.q)}`);
  }
  if (params.f !== undefined) parts.push(`f=${encode(params.f)}`);
  if (params.fit !== undefined) parts.push(`fit=${encode(params.fit)}`);
  // Valueless flags are deliberate: the API treats these as presence flags, not values, and this
  // is the canonical form the Localess UI itself links to. Do not "fix" these to `=true`.
  if (params.thumbnail) parts.push('thumbnail');
  return parts.join('&');
}
