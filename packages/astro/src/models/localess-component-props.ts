import type { Assets, ContentData, Links, References } from '@localess/model';

/**
 * Props for the built-in {@link LocalessComponent} renderer.
 *
 * Kept independent from {@link LocalessSchemaProps} (the contract schema components registered
 * via `components`/`componentsDir` or `customFallbackComponent` must accept) so the renderer's
 * props can evolve without changing the schema-component contract. Type your own registered
 * components with `LocalessSchemaProps<T>`.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessComponentProps<T extends ContentData = ContentData> = {
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
