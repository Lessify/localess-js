import type React from 'react';

import { FONT_BOLD, FONT_NORMAL } from '../console';
import {
  type AnyLocalessComponent,
  type AssetTransformParams,
  type ContentAsset,
  type EventToAppOf,
  type EventToAppType,
  type LocalessClient,
  localessClient,
  type LocalessOptions,
} from './models';
import { buildAssetQueryString, isBrowser, isIframe, loadLocalessSync } from './utils';

let _origin: string | undefined = undefined;
let _client: LocalessClient | undefined = undefined;
let _components: Record<string, React.ElementType> = {};
let _fallbackComponent: React.ElementType | undefined = undefined;
let _enableSync: boolean = false;
let _syncPromise: Promise<void> | undefined = undefined;
let _assetPathPrefix = '';

/**
 * Initialize the Localess SDK.
 *
 * Normally called **once** per module graph, at application startup (e.g. root layout,
 * `_app.tsx`) before any other SDK function is used. Calling it again overwrites the
 * existing client and state in that same module graph.
 *
 * - Creates the underlying {@link LocalessClient} with the supplied API options.
 * - Registers the component map and optional fallback component.
 * - When `enableSync` is `true` and the page is running inside the Visual Editor iframe,
 *   injects the Localess sync script into `<head>` to enable live editing events.
 *
 * **Exception — `@localess/react/rsc`'s `LocalessClientDocument` fallback** (used under
 * Next.js `output: 'export'`, which cannot run the primary `LocalessDocument`'s Server
 * Action): Next.js App Router bundles Server and Client Components into separate module
 * graphs, so a server-side `localessInit()` call never populates the registry or `enableSync`
 * state a Client Component sees. Call `localessInit()` a **second time**, from inside that
 * Client Component boundary, using a **public token** (read-only, published content and
 * translations only — safe to expose client-side, unlike a secret token) to populate that
 * graph's state too. See `docs/react.md`'s "Client-Side Fallback for Static Export".
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
 *   token: 'YOUR_API_TOKEN',          // secret token — keep server-side only
 *   enableSync: process.env.NODE_ENV !== 'production',
 *   components: { page: Page, header: Header, teaser: Teaser },
 * });
 * ```
 */
export function localessInit(options: LocalessOptions): LocalessClient {
  const { components, fallbackComponent, enableSync, ...restOptions } = options;
  _client = localessClient(restOptions);
  _origin = restOptions.origin;

  _assetPathPrefix = `${options.origin}/api/v1/spaces/${options.spaceId}/assets/`;

  _components = components || {};
  _fallbackComponent = fallbackComponent;
  if (enableSync) {
    _enableSync = true;
    // Script will be loaded in client.
    _syncPromise = loadLocalessSync(restOptions.origin).catch(error => {
      console.error('[Localess] Failed to load sync script.', error);
    });
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
 * @param component - The React component to render for this schema key. Must accept
 *   {@link LocalessComponentProps} (`data`, plus optional `links`/`references`/`assets`).
 */
export function registerComponent(key: string, component: AnyLocalessComponent): void {
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
 * @param components - A record mapping schema keys to React components, each accepting
 *   {@link LocalessComponentProps}.
 */
export function setComponents(components: Record<string, AnyLocalessComponent>): void {
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
  console.error(`[Localess] component %c${key}%c can't be found.`, FONT_BOLD, FONT_NORMAL);
  return undefined;
}

/**
 * Sets the fallback component rendered when no registry match is found for a schema key.
 *
 * The fallback receives the same `data`, `links`, and `references` props as any
 * registered component, so it can render a generic placeholder or log the unknown schema.
 *
 * @param fallbackComponent - The React component to use as the fallback. Must accept
 *   {@link LocalessComponentProps} (`data`, plus optional `links`/`references`/`assets`).
 */
export function setFallbackComponent(fallbackComponent: AnyLocalessComponent): void {
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
 * Returns `true` when Visual Editor sync is enabled and actually usable in the current context:
 * `enableSync: true` was passed to `localessInit`, code is running in the browser, and the page
 * is loaded inside the Visual Editor iframe.
 *
 * Self-sufficient: callers don't need to separately check {@link isBrowser} or {@link isIframe}.
 *
 * Used internally by {@link localessSyncOn} and {@link localessSyncOnChange} to decide whether to
 * subscribe to sync events — and therefore indirectly by {@link LocalessDocument} and {@link useLocaless}.
 *
 * @returns `true` if sync is enabled and usable, `false` otherwise.
 */
export function isSyncEnabled(): boolean {
  return _enableSync && isBrowser() && isIframe();
}

/**
 * Returns the raw `enableSync` flag passed to {@link localessInit}, without the
 * {@link isBrowser} / {@link isIframe} gating that {@link isSyncEnabled} applies.
 *
 * Module-scope state set by `localessInit()` in a Server Component is not visible to code
 * bundled into a separate Client Component module graph (Next.js App Router bundles Server
 * and Client Components separately). Use this to read the configured flag server-side and
 * pass it down as a prop — e.g. to {@link LocalessSync} — instead of calling `isSyncEnabled()`
 * (or this function) from within a Client Component, where the module-scope value was never set.
 *
 * @returns The `enableSync` value passed to `localessInit`, defaulting to `false`.
 */
export function isSyncConfigured(): boolean {
  return _enableSync;
}

/**
 * Resolves once the Visual Editor sync script has loaded and `window.localess` is available.
 *
 * Resolves immediately if sync was not enabled via `localessInit`, or if the script has already
 * loaded. Never rejects — a failed script load is logged via {@link loadLocalessSync} and resolves
 * anyway, since the rest of the app functions without live editing.
 *
 * Use this before subscribing directly to `window.localess.on(...)` to avoid a race where the
 * listener is attached before the sync script has run. Prefer {@link localessSyncOn} instead —
 * it wraps this exact pattern.
 *
 * @returns A promise that resolves when sync is ready (or immediately, if not applicable).
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   if (isSyncEnabled()) {
 *     localessSyncReady().then(() => {
 *       window.localess?.on(['input', 'change'], event => { ... });
 *     });
 *   }
 * }, []);
 * ```
 */
export function localessSyncReady(): Promise<void> {
  return _syncPromise ?? Promise.resolve();
}

/**
 * Subscribes to Visual Editor sync event(s), handling the `isSyncEnabled()` check and the
 * {@link localessSyncReady} wait internally so call sites don't have to.
 *
 * No-op if sync isn't enabled or usable in the current context (see {@link isSyncEnabled}).
 *
 * @param event - A single event type or array of event types to subscribe to.
 * @param callback - Called with the event, narrowed to the variant(s) matching `event`.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   localessSyncOn(['input', 'change'], event => setContentData(event.data));
 * }, []);
 * ```
 */
export function localessSyncOn<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): void {
  if (!isSyncEnabled()) return;
  localessSyncReady().then(() => {
    window.localess?.on(event, callback);
  });
}

/**
 * Subscribes to content-change Visual Editor sync events (`input` and `change`), handling the
 * `isSyncEnabled()` check and the {@link localessSyncReady} wait internally so call sites don't
 * have to.
 *
 * Equivalent to `localessSyncOn(['input', 'change'], callback)` (mirrors `window.localess.onChange`).
 * For other event types (`save`, `publish`, `pong`, `enterSchema`, `hoverSchema`), use {@link localessSyncOn}.
 *
 * No-op if sync isn't enabled or usable in the current context (see {@link isSyncEnabled}).
 *
 * @param callback - Called with the `input`/`change` event.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   localessSyncOnChange(event => setContentData(event.data));
 * }, []);
 * ```
 */
export function localessSyncOnChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): void {
  if (!isSyncEnabled()) return;
  localessSyncReady().then(() => {
    window.localess?.onChange(callback);
  });
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
 * @param params
 * @returns The fully qualified asset URL string.
 *
 * @example
 * ```tsx
 * <img src={resolveAsset(data.heroImage)} alt={data.heroImage.alt} />
 * ```
 */
export function resolveAsset(asset: ContentAsset, params?: AssetTransformParams): string {
  const base = `${_assetPathPrefix}${asset.uri}`;
  const qs = buildAssetQueryString(params);
  return qs ? `${base}?${qs}` : base;
}
