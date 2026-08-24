/**
 * Sole internal boundary to `@localess/client`. Every other file in this package imports
 * types and values through this module (relatively, e.g. `./models` or `../core/models`)
 * instead of importing `@localess/client` directly — see `packages/vue/CONTRIBUTING.md`.
 */
export type { ContentDataSchema, EventToAppOf, EventToAppType, LocalessClient, LocalessClientOptions } from '@localess/client';
export { isBrowser, isIframe, loadLocalessSync, LocalessApiError, localessClient, localessEditable } from '@localess/client';
