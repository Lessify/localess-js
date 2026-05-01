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

export * from '../core/components/localess-component';
export { isSyncEnabled } from '../core/state';
export * from '../ssr';
export * from './localess-document';
