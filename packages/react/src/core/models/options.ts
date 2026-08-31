import type { LocalessClientOptions } from '@localess/client';

import { LocalessSchemaProps } from './localess-schema-props';

export type { LocalessClient, LocalessClientOptions } from '@localess/client';
export { LocalessApiError } from '@localess/client';

/**
 * A React component accepting {@link LocalessSchemaProps} for *some* schema-specific
 * `ContentData` subtype — which one varies per registry entry, so it can't be named here.
 *
 * Uses `any` for that subtype, not to opt out of type checking, but because TypeScript has no
 * way to express "a subtype of `ContentData`, just not statically which one" (an existential
 * type) other than `any`. Function/component prop types are checked contravariantly, so a
 * component declared as `LocalessSchemaProps<HeroSection>` (the documented per-schema
 * pattern) is never assignable to a registry slot typed with a concrete `ContentData` — only
 * `any` keeps every schema-specific component assignable here.
 *
 * Only used at the **registration** surface (`localessInit`'s `components`/`fallbackComponent`).
 * The registry's internal storage
 * and lookup (`getComponent`/`getFallbackComponent`) intentionally stay typed as the looser
 * `React.ElementType` — the render call sites pass a `ref` through, which only
 * `React.ElementType`'s broader union tolerates; narrowing it there reintroduces a "Property
 * 'ref' does not exist" error for plain (non-`forwardRef`) function components.
 */
export type AnyLocalessComponent = React.ComponentType<LocalessSchemaProps<any>>;

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
  components?: Record<string, AnyLocalessComponent>;
  /**
   * Fallback React component rendered when `_schema` has no match in the registry.
   * Receives the same `data`, `links`, and `references` props as any registered component.
   * If omitted, an inline error message is rendered instead.
   */
  fallbackComponent?: AnyLocalessComponent;
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
