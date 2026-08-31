import type { Assets, ContentData, Links, References } from '@localess/client';

/**
 * Props every schema component registered in the {@link LocalessComponent} registry must accept
 * (via `components`/`componentsDir`, or as `customFallbackComponent`).
 *
 * Deliberately independent from {@link LocalessComponentProps} (the built-in renderer's own
 * props) so the schema-component contract can be restricted or extended without affecting
 * the renderer, and vice versa.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 *
 * @example
 * ```astro
 * ---
 * import type { LocalessSchemaProps } from '@localess/astro';
 *
 * export type Props = LocalessSchemaProps<HeroSection>;
 * ---
 * ```
 */
export type LocalessSchemaProps<T extends ContentData = ContentData> = {
  /**
   * The content data object to render. Must have a `_schema` field that matches a key
   * in the component registry configured via `localess()`.
   */
  data: T;
  /**
   * Optional map of content links keyed by link ID.
   * Pass through to nested `LocalessComponent` instances so they can resolve {@link ContentLink} values.
   */
  links?: Links;
  /**
   * Optional map of resolved content references keyed by reference ID.
   * Pass through to nested `LocalessComponent` instances that consume referenced content.
   */
  references?: References;
  /**
   * Optional map of resolved content assets keyed by asset ID.
   * Pass through to nested `LocalessComponent` instances that consume asset content.
   */
  assets?: Assets;
  [prop: string]: unknown;
};
