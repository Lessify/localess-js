import type { Assets, ContentData, Links, References } from '@localess/client';

/**
 * Props shape for {@link LocalessComponent} and any component registered in its registry
 * (via `components`/`componentsDir`, or as `customFallbackComponent`).
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
