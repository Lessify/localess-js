import { AssetTransformParams } from '../models';

export function buildAssetQueryString(params?: AssetTransformParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.w !== undefined) parts.push(`w=${params.w}`);
  if (params.h !== undefined) parts.push(`h=${params.h}`);
  if (params.q !== undefined) parts.push(`q=${params.q}`);
  if (params.f !== undefined) parts.push(`f=${params.f}`);
  // Valueless flags are deliberate: the API treats these as presence flags, not values, and this
  // is the canonical form the Localess UI itself links to. Do not "fix" these to `=true`.
  if (params.download) parts.push('download');
  if (params.thumbnail) parts.push('thumbnail');
  return parts.join('&');
}
