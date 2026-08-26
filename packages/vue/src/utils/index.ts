/**
 * One of three internal boundaries to `@localess/client` (with `../models` and `../client.ts`).
 * Every other file in this package imports functions through this module (relatively, e.g.
 * `./utils` or `../utils`) instead of importing `@localess/client` directly — see
 * `packages/vue/CONTRIBUTING.md`.
 */
export { isBrowser, isIframe, loadLocalessSync, localessEditable } from '@localess/client';
