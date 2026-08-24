/**
 * Sole internal boundary to `@localess/client`. Every other file in this package imports
 * types and values through this module (relatively, e.g. `../models`) instead of importing
 * `@localess/client` directly — see `packages/svelte/CONTRIBUTING.md`.
 */
export type {
  Assets,
  Content,
  ContentData,
  ContentDataSchema,
  EventToAppOf,
  EventToAppType,
  Links,
  LocalessClient,
  LocalessClientOptions,
  References,
} from '@localess/client';
export { isBrowser, isIframe, loadLocalessSync, LocalessApiError, localessClient, localessEditable } from '@localess/client';
