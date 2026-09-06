/**
 * Internal boundary to the root packages. Every other file in this package imports
 * functions through this module instead of importing `@localess/client` or
 * `@localess/live-preview` directly — see `packages/react/CONTRIBUTING.md`.
 */
export {
  buildAssetQueryString,
  createComponentIndex,
  findLink,
  formatComponentKeyCollisions,
  normalizeComponentKey,
} from '@localess/client';
export {
  createSyncController,
  isBrowser,
  isIframe,
  isServer,
  loadLocalessSync,
  localessEditable,
  localessEditableField,
} from '@localess/live-preview';
