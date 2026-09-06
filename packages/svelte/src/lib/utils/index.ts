/**
 * Internal boundary to the root packages. Every other file in this package imports
 * functions through this module instead of importing `@localess/client` or
 * `@localess/live-preview` directly — see `packages/svelte/CONTRIBUTING.md`.
 */
export { findLink } from '@localess/client';
export { createSyncController, isBrowser, isIframe, isServer, localessEditable, localessEditableField } from '@localess/live-preview';
