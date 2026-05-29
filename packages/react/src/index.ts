/**
 * @localess/react
 *
 * Default export — Single Page Applications (SPA) and fully client-rendered React apps.
 * Includes the complete API: initialization, component registry, components, hooks,
 * Visual Editor live editing helpers, rich text rendering, and all TypeScript types.
 *
 * Use this export when:
 * - Building a Single Page Application (SPA) or client-rendered React app
 * - All code runs in the browser (no server components)
 * - You need live Visual Editor editing in browser-based applications
 *
 * For server-rendering without live editing use `@localess/react/ssr`.
 * For React Server Components with live editing use `@localess/react/rsc`.
 *
 * @example
 * ```ts
 * import { localessInit, LocalessComponent, useLocaless, localessEditable } from '@localess/react';
 * ```
 */

export * from './core/components';
export * from './core/hooks';
export type * from './core/models';
export * from './core/richtext';
export * from './core/state';
export * from './core/utils';
