/**
 * @localess/react/rsc
 *
 * React Server Components export — use in Next.js App Router and other RSC-capable frameworks.
 * Extends the SSR export with client-side components and hooks for Visual Editor live editing.
 *
 * Use this export when:
 * - Using Next.js App Router with React Server Components
 * - You need live Visual Editor editing alongside server-rendered components
 * - Building modern React apps with a clear server / client component boundary
 *
 * For the default SPA export use `@localess/react`.
 * For SSR without live editing (static exports) use `@localess/react/ssr`.
 *
 * Typical pattern — import path is the same for both server and client files:
 * @example
 * ```ts
 * // Server Component (Next.js App Router)
 * import { localessInit, getLocalessClient, LocalessServerComponent } from '@localess/react/rsc';
 *
 * // Client Component ('use client')
 * import { LocalessDocument, useLocaless, localessEditable } from '@localess/react/rsc';
 * ```
 *
 * NOT compatible with Next.js `output: 'export'` — use `@localess/react/ssr` for static exports.
 */

// ─── SSR Base (server-safe) ───────────────────────────────────────────────────
// Everything from @localess/react/ssr is re-exported:
//   localessInit, getLocalessClient, registerComponent, unregisterComponent,
//   setComponents (via core/state), getComponent, setFallbackComponent,
//   getFallbackComponent, resolveAsset
//   LocalessServerComponent + LocalessServerComponentProps
//   renderRichTextToReact
//   isServer, findLink
//   All TypeScript content & client types
export * from '../ssr';

// ─── Client Components ('use client') ────────────────────────────────────────
// LocalessDocument — wraps LocalessServerComponent and auto-subscribes to Visual
//                    Editor sync events (input / change). Renders immediately with
//                    server-preloaded data, then updates live from the editor.
//                    Requires a 'use client' boundary in Next.js App Router.
export * from '../core/components';

// ─── Client Hooks ('use client') ─────────────────────────────────────────────
// useLocaless<T>(slug, options?) — fetch content by slug inside a Client Component.
//                                  Accepts a string or string[] slug (joined with '/').
//                                  Automatically subscribes to Visual Editor sync events
//                                  when isSyncEnabled() is true.
//                                  Returns Content<T> | undefined.
export * from '../core/hooks';

// ─── Sync State ──────────────────────────────────────────────────────────────
// isSyncEnabled() — returns true when enableSync was set in localessInit
export { isSyncEnabled } from '../core/state';
