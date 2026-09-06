import { AssetTransformParams } from '../models';

/** Encodes a value for use in the query string. */
function encode(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * Builds the query string for an asset URL from transform parameters.
 *
 * Emits in a fixed order (`w`, `h`, `q`, `f`, `fit`, then the flags) so URLs are
 * stable and CDN-cacheable for a given set of parameters. Absent parameters are
 * omitted rather than defaulted — the API owns the defaults, so an unset `fit`
 * leaves existing URLs byte-identical.
 */
export function buildAssetQueryString(params?: AssetTransformParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.w !== undefined) parts.push(`w=${encode(params.w)}`);
  if (params.h !== undefined) parts.push(`h=${encode(params.h)}`);
  if (params.q !== undefined) parts.push(`q=${encode(params.q)}`);
  if (params.f !== undefined) parts.push(`f=${encode(params.f)}`);
  if (params.fit !== undefined) parts.push(`fit=${encode(params.fit)}`);
  // Valueless flags are deliberate: the API treats these as presence flags, not values, and this
  // is the canonical form the Localess UI itself links to. Do not "fix" these to `=true`.
  if (params.download) parts.push('download');
  if (params.thumbnail) parts.push('thumbnail');
  return parts.join('&');
}
