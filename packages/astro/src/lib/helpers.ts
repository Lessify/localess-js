import type { AssetTransformParams, ContentAsset, ContentData, LocalessClient } from '../models';

/**
 * Returns the `LocalessClient` instance built by the `localess()` integration
 * from `astro.config.mjs` and exposed on `globalThis` via a `page-ssr`-only script.
 *
 * @throws {Error} If the `localess()` integration has not been configured.
 */
export function getLocalessClient(): LocalessClient {
  if (!globalThis?.localessClientInstance) {
    console.error('[Localess] No client found. Please check if the `localess()` integration is configured in astro.config.mjs.');
    throw new Error('[Localess] No client found.');
  }
  return globalThis.localessClientInstance;
}

/**
 * Retrieves draft content stashed into `Astro.locals` by the live-preview middleware
 * (only present when `livePreview: true` and the current request is a validated
 * Visual Editor preview POST — see `live-preview/middleware.ts`).
 *
 * @example
 * ```ts
 * const preview = await getLivePayload(Astro);
 * const data = preview.data ?? (await getLocalessClient().getContentBySlug('home')).data;
 * ```
 */
export async function getLivePayload<T extends ContentData = ContentData>({
  locals,
}: {
  locals: { _localess_preview_data?: { data?: T } };
}): Promise<{ data?: T }> {
  const { data } = locals._localess_preview_data ?? {};
  return data ? { data } : {};
}

/**
 * Resolves a {@link ContentAsset} to its full URL, delegating to the initialized
 * client's `assetLink` method.
 *
 * @example
 * ```astro
 * <img src={resolveAsset(data.heroImage, { w: 800 })} alt={data.heroImage.alt} />
 * ```
 */
export function resolveAsset(asset: ContentAsset, params?: AssetTransformParams): string {
  return getLocalessClient().assetLink(asset, params);
}

declare global {
  var localessClientInstance: LocalessClient | undefined;
}
