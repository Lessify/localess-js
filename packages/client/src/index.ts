export * from './cache';
export * from './cache-tags';
export * from './client';
export * from './component-naming';
export * from './models';
export * from './utils';

/**
 * @deprecated Visual Editor support now lives in `@localess/live-preview`.
 *
 * These are re-exported so existing imports keep working, and will be removed in
 * a future major. Import from `@localess/live-preview` — or, if you use a
 * framework package, keep importing from that package, which re-exports them.
 *
 * They were never a good fit here: `@localess/client` is documented
 * server-side-only (ADR 001) while all of this is browser-only code, to the
 * point that `loadLocalessSync` had to guard against its own package's premise
 * with an `isServer()` early return. See ADR 013.
 */
export type { EventCallback, EventToApp, EventToAppOf, EventToAppType, LocalessSync } from '@localess/live-preview';
export { isBrowser, isIframe, isServer, loadLocalessSync, localessEditable, localessEditableField } from '@localess/live-preview';
