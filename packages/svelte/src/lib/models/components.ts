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
 * Props every component registered in the Localess component registry must accept.
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
