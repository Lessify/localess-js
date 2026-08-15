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
 * `LocalessDocument` is the primary export here — a Server Component whose live sync is
 * driven by a Server Action (no client-side component registry, ever). It requires a
 * live server at request time and does **not** work under Next.js `output: 'export'`.
 *
 * `LocalessClientDocument` is the `output: 'export'` fallback — a Client Component that
 * re-renders client-side on sync events. It requires registering your component map a
 * second time from a Client Component boundary (see `docs/react.md`'s "Client-Side
 * Fallback for Static Export" section) — use it only when `LocalessDocument` isn't an
 * option.
 *
 * @example
 * ```ts
 * // Server Component (Next.js App Router)
 * import { localessInit, getLocalessClient, LocalessDocument } from '@localess/react/rsc';
 *
 * // Client Component ('use client')
 * import { useLocaless, localessEditable } from '@localess/react/rsc';
 * ```
 */

export * from '../core/components/localess-component';
export * from '../core/hooks';
export { isSyncEnabled, localessSyncOn, localessSyncOnChange, localessSyncReady } from '../core/state';
export * from '../ssr';
export * from './localess-document';
export {
  LocalessDocument as LocalessClientDocument,
  type LocalessDocumentProps as LocalessClientDocumentProps,
} from '../core/components/localess-document';
