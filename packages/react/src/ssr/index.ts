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

// ─── Initialization & State ───────────────────────────────────────────────────
// localessInit       — initialize client and register components (no enableSync in SSR)
// getLocalessClient  — access the initialized LocalessClient instance
// registerComponent / unregisterComponent / setComponents / getComponent
// setFallbackComponent / getFallbackComponent
// resolveAsset       — convert ContentAsset → full URL string
export {
  localessInit,
  getLocalessClient,
  registerComponent,
  unregisterComponent,
  getComponent,
  getFallbackComponent,
  resolveAsset,
} from '../core/state';

// ─── Components ──────────────────────────────────────────────────────────────
// LocalessServerComponent — server-safe variant of LocalessComponent; maps content._schema
//                           to a registered React component. No 'use client' directive.
//                           Use in SSR pages and Next.js static export pages.
export * from './localess-component';
export * from './localess-document';

// ─── Rich Text ───────────────────────────────────────────────────────────────
// renderRichTextToReact(content) — convert a ContentRichText (TipTap document) to React.ReactNode
export { renderRichTextToReact } from '../core/richtext';

// ─── Utils ───────────────────────────────────────────────────────────────────
// isServer               — true when running in a Node.js / server environment
// findLink(links, link)  — resolve a ContentLink to a URL string
export * from '../core/utils';

// ─── TypeScript Types ────────────────────────────────────────────────────────
// (same set as @localess/react — all content and client types are server-safe)
export type * from '../core/models';

