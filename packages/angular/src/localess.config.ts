import { InjectionToken } from '@angular/core';

export type LocalessConfig = {
  /**
   * A fully qualified domain name with protocol (http/https) and port.
   *
   * Example: https://my-localess.web.app
   */
  origin: string;
  /**
   * Localess space ID, can be found in the Localess Space settings
   */
  spaceId: string;
  /**
   * Localess API token, can be found in the Localess Space settings.
   *
   * Supply a **secret token** when content is fetched server-side only and hydrated to the
   * browser (SSR apps). Supply a **public token** (read-only, published content only) when the
   * app fetches content directly in the browser (pure client-side-rendered apps).
   */
  token: string;
  /**
   * Content version to fetch, leave empty for 'published' or 'draft' for the latest draft
   */
  version?: 'draft';
  /**
   * Enable debug mode
   */
  debug?: boolean;
  /**
   * Enable Visual Editor sync script load
   */
  enableSync?: boolean;
  /**
   * Cache TTL (time to live) in seconds for API responses, forwarded to `localessClient`.
   *
   * @default 300 (5 minutes)
   */
  cacheTTL?: number | false;
};

export const LOCALESS_CONFIG = new InjectionToken<LocalessConfig>('LOCALESS_CONFIG', {
  providedIn: 'root',
  factory: () => defaultConfig,
});

export const defaultConfig: LocalessConfig = {
  origin: '',
  spaceId: '',
  token: '',
};

/**
 * Resolves once the Visual Editor sync script has loaded and `window.localess` is available.
 *
 * Defaults to an already-resolved promise so injecting this token is always safe even if
 * `enableSync` was never set. `provideLocaless` overrides it with the real load promise
 * when `enableSync: true`.
 */
export const LOCALESS_SYNC_READY = new InjectionToken<Promise<void>>('LOCALESS_SYNC_READY', {
  providedIn: 'root',
  factory: () => Promise.resolve(),
});
