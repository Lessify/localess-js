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
 * import { localessVite } from '@localess/react/vite';
 * ```
 */
export type { LocalessViteOptions } from './localess-vite';
export { localessVite } from './localess-vite';
export type { LocalessInitOptions } from './vite-plugin-localess-init';
