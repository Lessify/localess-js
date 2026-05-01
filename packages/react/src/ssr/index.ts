/**
 * @localess/react/ssr
 *
 * Server-side rendering export — safe for SSR and Next.js static site generation (`output: 'export'`).
 * Does NOT include live Visual Editor editing, client-side hooks, or any browser-only utilities.
 * This is the smallest bundle of the three exports.
 *
 * Use this export when:
 * - Using Next.js with `output: 'export'` (static site generation)
 * - Server-side rendering where live editing is not required
 * - You want to minimise bundle size by excluding all sync/bridge code
 *
 * For the default SPA export use `@localess/react`.
 * For React Server Components with live editing use `@localess/react/rsc`.
 *
 * @example
 * ```ts
 * import { localessInit, LocalessServerComponent } from '@localess/react/ssr';
 * ```
 *
 * NOT available in this export:
 * - LocalessDocument   (requires 'use client')
 * - useLocaless        (requires 'use client')
 * - localessEditable / localessEditableField / isBrowser / isIframe (browser-only)
 * - isSyncEnabled      (not meaningful without live editing)
 * - Sync event types   (LocalessSync, EventToApp, EventCallback, EventToAppType)
 */

export type * from '../core/models';
export { renderRichTextToReact } from '../core/richtext';
export {
  getComponent,
  getFallbackComponent,
  getLocalessClient,
  localessInit,
  registerComponent,
  resolveAsset,
  unregisterComponent,
} from '../core/state';
export * from '../core/utils';
export * from './localess-component';
export * from './localess-document';
