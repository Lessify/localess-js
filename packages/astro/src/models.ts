import type { LocalessClientOptions } from '@localess/client';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export type {
  AssetMetadata,
  Assets,
  Content,
  ContentAsset,
  ContentData,
  ContentDataField,
  ContentDataSchema,
  ContentLink,
  ContentMetadata,
  ContentReference,
  ContentRichText,
  Links,
  References,
} from '@localess/client';
export type { LocalessClient } from '@localess/client';

/**
 * Initialization options for {@link localessInit}.
 *
 * Extends {@link LocalessClientOptions} (origin, spaceId, token, version, debug, cacheTTL)
 * with Astro-specific settings for component mapping and Visual Editor sync.
 */
export type LocalessOptions = LocalessClientOptions & {
  /**
   * Map of schema keys to Astro components used by `LocalessComponent` to render content blocks.
   * Keys must match the `_schema` field of your Localess content objects.
   */
  components?: Record<string, AstroComponentFactory>;
  /**
   * Fallback Astro component rendered when `_schema` has no match in the registry.
   * If omitted, an inline error message is rendered instead.
   */
  fallbackComponent?: AstroComponentFactory;
  /**
   * When `true`, `LocalessDocument` renders `LocalessSync`, which reloads the page on
   * Visual Editor edit events. Only takes effect inside the Visual Editor iframe.
   *
   * @default false
   */
  enableSync?: boolean;
};
