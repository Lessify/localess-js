/**
 * Internal boundary to the root packages. Every other file in this package imports
 * functions through this module (relatively, e.g. `./utils` or `../utils`) instead of
 * importing `@localess/client` or `@localess/live-preview` directly — see
 * `packages/vue/CONTRIBUTING.md`.
 */
export { normalizeComponentKey } from '@localess/client';
export { createSyncController, isBrowser, isIframe, localessEditable, localessEditableField } from '@localess/live-preview';
