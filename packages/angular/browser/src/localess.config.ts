import {InjectionToken} from "@angular/core";

export type LocalessBrowserConfig = {
  /**
   * A fully qualified domain name with protocol (http/https) and port.
   *
   * Example: https://my-localess.web.app
   */
  origin: string;
  /**
   * Localess space ID can be found in the Localess Space settings
   */
  spaceId: string;
  /**
   * Path to the assets
   */
  assetPathPrefix: string;
  /**
   * Enable debug mode
   */
  debug?: boolean;
  /**
   * Whether Visual Editor sync was requested via `provideLocalessBrowser`.
   */
  enableSync?: boolean;
};

export const LOCALESS_BROWSER_CONFIG = new InjectionToken<LocalessBrowserConfig>(
  'LOCALESS_BROWSER_CONFIG',
  {
    providedIn: 'root',
    factory: () => defaultBrowserConfig
  }
);

export const defaultBrowserConfig: LocalessBrowserConfig = {
  origin: '',
  spaceId: '',
  assetPathPrefix: '',
};

/**
 * Resolves once the Visual Editor sync script has loaded and `window.localess` is available.
 *
 * Defaults to an already-resolved promise so injecting this token is always safe even if
 * `enableSync` was never set. `provideLocalessBrowser` overrides it with the real load promise
 * when `enableSync: true`.
 */
export const LOCALESS_SYNC_READY = new InjectionToken<Promise<void>>(
  'LOCALESS_SYNC_READY',
  {
    providedIn: 'root',
    factory: () => Promise.resolve()
  }
);
