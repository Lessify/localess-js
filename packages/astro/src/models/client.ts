import { ComponentNamingStrategy, LocalessClientOptions } from '@localess/client';
import { AstroComponentFactory } from 'astro/runtime/server/index.js';

/**
 * Configuration for the `localess()` Astro integration.
 *
 * Extends {@link LocalessClientOptions} (origin, spaceId, token, version, debug, cacheTTL,
 * timeoutMs, retry, fetchInit) with Astro-specific settings for component mapping, fallback
 * rendering, and Visual Editor sync.
 *
 * `fetch` and `cache` are deliberately excluded. The client options are serialized with
 * `JSON.stringify` into the generated `virtual:localess-init` module: a function cannot survive that
 * at all, and an `ICache` arrives as `{}` with its methods gone, which would throw on first use.
 * Omitting them makes passing either a compile error rather than a runtime surprise.
 */
export type LocalessOptions = Omit<LocalessClientOptions, 'fetch' | 'cache'> & {
  /**
   * Map of schema keys to Astro components, merged with components auto-discovered from
   * `<componentsDir>/**\/*.astro`. Both this map's keys and `_schema` values are
   * compared through {@link LocalessOptions.componentNaming}.
   */
  components?: Record<string, AstroComponentFactory>;
  /**
   * How a content `_schema` key is matched to a registered component. Applied to both the
   * registry keys (auto-discovered filenames and this map's keys) and the incoming `_schema`,
   * so a schema named `hero-section` can resolve `HeroSection.astro`.
   *
   * Unlike the other framework packages this accepts the built-in strategy names only, not a
   * custom function: these options are serialized with `JSON.stringify` into the generated
   * virtual module, which a function cannot survive.
   *
   * **Changed in v4:** the default is now `'exact'`. Earlier versions always matched through
   * camelCase; set `componentNaming: 'camelCase'` to keep that behaviour.
   *
   * @default 'exact'
   */
  componentNaming?: ComponentNamingStrategy;
  /**
   * The directory Astro components live under. Defaults to `"src"`.
   * Auto-discovery globs `<componentsDir>/**\/*.astro`.
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
