import {InjectionToken} from "@angular/core";

export type LocalessServerConfig = {
  /**
   * A fully qualified domain name with protocol (http/https) and port.
   *
   * Example: https://my-localess.web.app
   */
  origin: string;
  /**
   * Localess space ID, cna be found in the Localess Space settings
   */
  spaceId: string;
  /**
   * Localess API token, can be found in the Localess Space settings
   */
  token: string;
  /**
   * Path to the assets
   */
  assetPathPrefix: string;
  /**
   * Content version to fetch, leave empty for 'published' or 'draft' for the latest draft
   */
  version?: 'draft' | string;
  /**
   * Enable debug mode
   */
  debug?: boolean;
};

export const LOCALESS_SERVER_CONFIG = new InjectionToken<LocalessServerConfig>(
  'LOCALESS_SERVER_CONFIG',
  {
    providedIn: 'root',
    factory: () => defaultServerConfig
  }
);

export const defaultServerConfig: LocalessServerConfig = {
  origin: '',
  spaceId: '',
  token: '',
  assetPathPrefix: '',
};
