import {LocalessClientOptions} from "@localess/client";
import {AstroComponentFactory} from "astro/runtime/server/index.js";

/**
 * Configuration for the `localess()` Astro integration.
 *
 * Extends {@link LocalessClientOptions} (origin, spaceId, token, version, debug, cacheTTL)
 * with Astro-specific settings for component mapping, fallback rendering, and Visual Editor sync.
 */
export type LocalessOptions = LocalessClientOptions & {
  /**
   * Map of schema keys to Astro components, merged with components auto-discovered from
   * `<componentsDir>/localess/**\/*.astro`. Both this map's keys and `_schema` values are
   * compared through `toCamelCase()`.
   */
  components?: Record<string, AstroComponentFactory>;
  /**
   * The directory Astro components live under. Defaults to `"src"`.
   * Auto-discovery globs `<componentsDir>/localess/**\/*.astro`.
   */
  componentsDir?: string;
  /**
   * Renders a fallback component in your frontend when a schema key has no registry match,
   * instead of throwing.
   * @default false
   */
  enableFallbackComponent?: boolean;
  /**
   * Path (relative to `componentsDir`) to a custom fallback component, e.g. `"localess/CustomFallback"`.
   * When omitted and `enableFallbackComponent` is `true`, the package's built-in
   * `FallbackComponent.astro` is used.
   */
  customFallbackComponent?: string;
  /**
   * Enables the default Visual Editor sync tier: on any `input`/`change`/`save`/`publish`/`unpublish`
   * event, debounce (~500ms) then reload the page. Ignored when `livePreview` is `true`.
   * @default false
   */
  enableSync?: boolean;
  /**
   * Enables the opt-in SSR live-preview tier: `save`/`publish`/`unpublish` reload the page;
   * `input`/`change` debounce (~500ms), POST the updated content to the current page, and
   * morphdom-patch the response into the live DOM instead of reloading. Requires Astro's
   * `output: 'server'` — the integration throws at config-setup time otherwise.
   * @default false
   */
  livePreview?: boolean;
};
