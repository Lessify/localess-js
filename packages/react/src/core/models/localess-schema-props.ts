import type { Assets, ContentData, Links, References } from '@localess/client';

/**
 * Props every schema component registered in the Localess component registry must accept
 * (via `localessInit`'s `components` map or `fallbackComponent`).
 *
 * Deliberately independent from {@link LocalessComponentProps} (the built-in renderer's own
 * props) so the schema-component contract can be restricted or extended without affecting
 * the renderer, and vice versa.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 *
 * @example
 * ```tsx
 * import type { LocalessSchemaProps } from '@localess/react';
 *
 * const HeroSection = ({ data, links, references }: LocalessSchemaProps<HeroSection>) => (
 *   <h1>{data.title}</h1>
 * );
 * ```
 */
export type LocalessSchemaProps<T extends ContentData = ContentData> = {
  /**
   * The content data object to render. Must have a `_schema` field that matches a key
   * in the component registry configured via `localessInit`.
   */
  data: T;
  /**
   * Optional map of content links keyed by link ID.
   * Pass through to child components so they can resolve {@link ContentLink} values with `findLink`.
   */
  links?: Links;
  /**
   * Optional map of resolved content references keyed by reference ID.
   * Pass through to child components that consume referenced content.
   */
  references?: References;
  /**
   * Optional map of resolved content assets keyed by asset ID.
   * Pass through to child components that consume asset content.
   */
  assets?: Assets;
};
