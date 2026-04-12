import type React from 'react';
import {loadLocalessSync, type LocalessClient, localessClient} from "@localess/client";
import {FONT_BOLD, FONT_NORMAL} from "../console";
import {type LocalessOptions, type ContentAsset} from "./models";

let _origin: string | undefined = undefined;
let _client: LocalessClient | undefined = undefined
let _components: Record<string, React.ElementType> = {};
let _fallbackComponent: React.ElementType | undefined = undefined;
let _enableSync: boolean = false;
let _assetPathPrefix = '';

/**
 * Initialize the Localess SDK.
 *
 * Must be called **once** at application startup (e.g. root layout, `_app.tsx`) before any
 * other SDK function is used. Calling it again overwrites the existing client and state.
 *
 * - Creates the underlying {@link LocalessClient} with the supplied API options.
 * - Registers the component map and optional fallback component.
 * - When `enableSync` is `true` and the page is running inside the Visual Editor iframe,
 *   injects the Localess sync script into `<head>` to enable live editing events.
 *
 * @param options - Initialization options. Extends {@link LocalessClientOptions} with
 *   `components`, `fallbackComponent`, and `enableSync`.
 * @returns The initialized {@link LocalessClient} instance.
 *
 * @example
 * ```ts
 * import { localessInit } from '@localess/react';
 * import { Page, Header, Teaser } from '@/components';
 *
 * localessInit({
 *   origin: 'https://my-localess.web.app',
 *   spaceId: 'YOUR_SPACE_ID',
 *   token: 'YOUR_API_TOKEN',          // keep server-side only
 *   enableSync: process.env.NODE_ENV !== 'production',
 *   components: { page: Page, header: Header, teaser: Teaser },
 * });
 * ```
 */
export function localessInit(options: LocalessOptions): LocalessClient {
  const {components, fallbackComponent, enableSync, ...restOptions} = options;
  _client = localessClient(restOptions);
  _origin = restOptions.origin;

  _assetPathPrefix = `${options.origin}/api/v1/spaces/${options.spaceId}/assets/`;

  _components = components || {};
  _fallbackComponent = fallbackComponent;
  if (enableSync) {
    _enableSync = true;
    // Script will be loaded in client.
    loadLocalessSync(restOptions.origin)
  }
  return _client;
}

/**
 * Returns the initialized {@link LocalessClient} instance.
 *
 * Throws an error if called before {@link localessInit}. Use this in server components,
 * API routes, or server-side data fetching functions to make API calls.
 *
 * @throws {Error} If `localessInit` has not been called yet.
 * @returns The active {@link LocalessClient}.
 *
 * @example
 * ```ts
 * const content = await getLocalessClient().getContentBySlug<MyPage>('home', { locale: 'en' });
 * ```
 */
export function getLocalessClient(): LocalessClient {
  if (!_client) {
    console.error('[Localess] No client found. Please check if the Localess is initialized. Use localessInit function.');
    throw new Error('[Localess] No client found.');
  }
  return _client;
}

/**
 * Adds a single component to the registry under the given schema key.
 *
 * The key must match the `_schema` field of the content objects you want to render.
 * Overwrites any previously registered component for the same key.
 *
 * @param key - The schema key (e.g. `'hero-section'`).
 * @param component - The React component to render for this schema key.
 */
export function registerComponent(key: string, component: React.ElementType): void {
  _components[key] = component;
}

/**
 * Removes a component from the registry by schema key.
 * No-op if the key does not exist.
 *
 * @param key - The schema key to remove.
 */
export function unregisterComponent(key: string): void {
  delete _components[key];
}

/**
 * Replaces the entire component registry with the supplied map.
 *
 * Useful when you need to swap all components at once (e.g. lazy-loaded registry).
 * Any previously registered components (including those set via `localessInit`) are discarded.
 *
 * @param components - A record mapping schema keys to React components.
 */
export function setComponents(components: Record<string, React.ElementType>): void {
  _components = components;
}

/**
 * Looks up a React component by its schema key.
 *
 * Returns `undefined` and logs a console error when the key is not found.
 * Called internally by {@link LocalessComponent} and {@link LocalessServerComponent}.
 *
 * @param key - The schema key to look up (matches `content._schema`).
 * @returns The registered React component, or `undefined` if not found.
 */
export function getComponent(key: string): React.ElementType | undefined {
  if (Object.hasOwn(_components, key)) {
    return _components[key];
  }
  console.error(`[Localess] component %c${key}%c can't be found.`, FONT_BOLD, FONT_NORMAL)
  return undefined;
}

/**
 * Sets the fallback component rendered when no registry match is found for a schema key.
 *
 * The fallback receives the same `data`, `links`, and `references` props as any
 * registered component, so it can render a generic placeholder or log the unknown schema.
 *
 * @param fallbackComponent - The React component to use as the fallback.
 */
export function setFallbackComponent(fallbackComponent: React.ElementType): void {
  _fallbackComponent = fallbackComponent;
}

/**
 * Returns the currently registered fallback component, or `undefined` if none is set.
 *
 * Called internally by {@link LocalessComponent} and {@link LocalessServerComponent}
 * when a schema key has no matching component in the registry.
 *
 * @returns The fallback React component, or `undefined`.
 */
export function getFallbackComponent(): React.ElementType | undefined {
  return _fallbackComponent;
}

/**
 * Returns `true` when Visual Editor sync was enabled via `enableSync: true` in `localessInit`.
 *
 * Used internally by {@link LocalessComponent}, {@link LocalessDocument}, and {@link useLocaless}
 * to decide whether to inject editable attributes and subscribe to sync events.
 *
 * @returns `true` if sync is enabled, `false` otherwise.
 */
export function isSyncEnabled(): boolean {
  return _enableSync;
}

export function getOrigin() {
  if (!_origin) {
    console.error('[Localess] No origin found. Please check if the Localess is initialized. Use localessInit function.');
    throw new Error('[Localess] No origin found.');
  }
  return _origin;
}

/**
 * Resolves a {@link ContentAsset} to its full URL string.
 *
 * Constructs the URL using the `origin` and `spaceId` from `localessInit`:
 * `{origin}/api/v1/spaces/{spaceId}/assets/{asset.uri}`
 *
 * @param asset - The asset reference object containing a `uri` field.
 * @returns The fully qualified asset URL string.
 *
 * @example
 * ```tsx
 * <img src={resolveAsset(data.heroImage)} alt={data.heroImage.alt} />
 * ```
 */
export function resolveAsset(asset: ContentAsset) {
  return `${_assetPathPrefix}${asset.uri}`;
}
