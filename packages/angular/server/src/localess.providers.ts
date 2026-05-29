import {EnvironmentProviders, makeEnvironmentProviders} from "@angular/core";
import {LOCALESS_SERVER_CONFIG} from "./localess.config";
import {ServerAssetService} from './services/asset.service';
import {ServerContentService} from './services/content.service';
import {ServerTranslationService} from './services/translation.service';

export type LocalessServerOptions = {
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
   * Content version to fetch, leave empty for 'published' or 'draft' for the latest draft
   */
  version?: 'draft' | string;
  /**
   * Enable debug mode
   */
  debug?: boolean;
};

export function provideLocalessServer(options: LocalessServerOptions): EnvironmentProviders[] {
  if (options.origin === undefined || options.origin === '') {
    throw new Error('Localess Origin can\'t be empty');
  }
  if (options.spaceId === undefined || options.spaceId === '') {
    throw new Error('Localess Space ID can\'t be empty');
  }
  if (options.token === undefined || options.token === '') {
    throw new Error('Localess Token can\'t be empty');
  }
  const providers: EnvironmentProviders[] = [
    makeEnvironmentProviders([
      {
        provide: LOCALESS_SERVER_CONFIG,
        useValue: {
          ...options,
          assetPathPrefix: `${options.origin}/api/v1/spaces/${options.spaceId}/assets/`,
        },
      },
      ServerAssetService,
      ServerContentService,
      ServerTranslationService,
    ])
  ];
  return providers;
}
