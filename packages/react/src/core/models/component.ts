import type React from 'react';

import type { Assets, Content, ContentData, Links, References } from './';

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

/**
 * A React component accepting {@link LocalessComponentProps} for *some* schema-specific
 * `ContentData` subtype — which one varies per registry entry, so it can't be named here.
 *
 * Uses `any` for that subtype, not to opt out of type checking, but because TypeScript has no
 * way to express "a subtype of `ContentData`, just not statically which one" (an existential
 * type) other than `any`. Function/component prop types are checked contravariantly, so a
 * component declared as `LocalessComponentProps<HeroSection>` (the documented per-schema
 * pattern) is never assignable to a registry slot typed with a concrete `ContentData` — only
 * `any` keeps every schema-specific component assignable here.
 *
 * Only used at the **registration** surface (`localessInit`'s `components`/`fallbackComponent`,
 * `registerComponent`, `setComponents`, `setFallbackComponent`). The registry's internal storage
 * and lookup (`getComponent`/`getFallbackComponent`) intentionally stay typed as the looser
 * `React.ElementType` — the render call sites pass a `ref` through, which only
 * `React.ElementType`'s broader union tolerates; narrowing it there reintroduces a "Property
 * 'ref' does not exist" error for plain (non-`forwardRef`) function components.
 */
export type AnyLocalessComponent = React.ComponentType<LocalessComponentProps<any>>;
