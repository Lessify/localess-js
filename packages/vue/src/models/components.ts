import type { Assets, Content, ContentData, Links, References } from '../models';

/**
 * Props for {@link LocalessDocument}.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessDocumentProps<T extends ContentData = ContentData> = {
  /**
   * The full content response object as returned by `getContentBySlug` or `getContentById`.
   * Must contain a `data` field with a valid `_schema` key.
   */
  document: Content<T>;
};

/**
 * Props every schema component registered in the Localess component registry must accept
 * (via `localessInit`'s `components` map).
 *
 * Deliberately independent from {@link LocalessComponentProps} (the built-in renderer's own
 * props) so the schema-component contract can be restricted or extended without affecting
 * the renderer, and vice versa.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import type { LocalessSchemaProps } from '@localess/vue';
 *
 * defineProps<LocalessSchemaProps<HeroSection>>();
 * </script>
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

/**
 * Props for the built-in {@link LocalessComponent} renderer.
 *
 * Kept independent from {@link LocalessSchemaProps} (the contract schema components registered
 * via `localessInit` must accept) so the renderer's props can evolve without changing the
 * schema-component contract. Type your own registered components with `LocalessSchemaProps<T>`.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessComponentProps<T extends ContentData = ContentData> = {
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
