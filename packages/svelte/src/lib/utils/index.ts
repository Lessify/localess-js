/**
 * One of three internal boundaries to `@localess/client` (with `../models` and `../client`).
 * Every other file in this package imports functions through this module (relatively, e.g.
 * `./utils` or `../utils`) instead of importing `@localess/client` directly — see
 * `packages/svelte/CONTRIBUTING.md`.
 */
export { findLink, isBrowser, isIframe, isServer, loadLocalessSync, localessEditable, localessEditableField } from '@localess/client';
