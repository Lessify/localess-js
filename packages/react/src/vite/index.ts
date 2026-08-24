/**
 * @localess/react/vite
 *
 * Vite plugin for Vite-based React SSR frameworks (TanStack Start, React
 * Router v7 framework mode, Remix Vite). Automates token-safe
 * `localessInit()` calls (secret token server-side, public token
 * client-side) and component auto-registration.
 *
 * @example
 * ```ts
 * import { localess } from '@localess/react/vite';
 * ```
 */
export type { LocalessOptions } from './localess';
export { localess } from './localess';
export type { LocalessInitOptions } from './vite-plugin-localess-init';
