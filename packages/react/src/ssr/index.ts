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
 * `localessClient` (the raw client factory, re-exported from `@localess/client`) is
 * included here for standalone build-time scripts that need their own client instance
 * outside the `localessInit()`/`getLocalessClient()` singleton lifecycle — e.g. a
 * `vite.config.ts` or `react-router.config.ts` enumerating prerender paths before any
 * app graph exists. Never import `@localess/client` directly in consumer code — go
 * through `@localess/react` (or `@localess/react/ssr`) instead.
 *
 * NOT available in this export:
 * - LocalessDocument   (requires 'use client')
 * - useLocaless        (requires 'use client')
 * - isSyncEnabled / localessSyncOn / localessSyncOnChange / localessSyncReady (not meaningful without live editing)
 */

export {
  getComponent,
  getFallbackComponent,
  getLocalessClient,
  localessInit,
  registerComponent,
  resolveAsset,
  setComponents,
  setFallbackComponent,
  unregisterComponent,
} from '../core/client';
export type * from '../core/models';
export { LocalessApiError } from '../core/models';
export { renderRichTextToReact } from '../core/richtext';
export * from '../core/utils';
export * from './localess-component';
export * from './localess-document';
export { localessClient } from '@localess/client';
