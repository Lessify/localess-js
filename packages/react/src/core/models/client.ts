import { LocalessClientOptions } from '@localess/client';
import type React from 'react';

export type { LocalessClient } from '@localess/client';

/**
 * Initialization options for {@link localessInit}.
 *
 * Extends {@link LocalessClientOptions} (origin, spaceId, token, version, debug, cacheTTL)
 * with React-specific settings for component mapping and Visual Editor sync.
 */
export type LocalessOptions = LocalessClientOptions & {
  /**
   * Map of schema keys to React components used by {@link LocalessComponent} and
   * {@link LocalessServerComponent} to render content blocks.
   *
   * Keys must match the `_schema` field of your Localess content objects.
   * Use lowercase hyphenated names by convention (e.g. `'hero-section'`).
   *
   * @example
   * ```ts
   * components: {
   *   'page': PageComponent,
   *   'hero-section': HeroSection,
   *   'nav-menu': NavMenu,
   * }
   * ```
   */
  components?: Record<string, React.ElementType>;
  /**
   * Fallback React component rendered when `_schema` has no match in the registry.
   * Receives the same `data`, `links`, and `references` props as any registered component.
   * If omitted, an inline error message is rendered instead.
   */
  fallbackComponent?: React.ElementType;
  /**
   * When `true`, injects the Localess Visual Editor sync script (`sync-v1.js`) into
   * `<head>` so that `input` and `change` events from the editor reach the app.
   * Only takes effect when the page is running inside the Visual Editor iframe.
   * Set to `false` (or omit) in production builds to avoid loading the script.
   *
   * @default false
   */
  enableSync?: boolean;
};
