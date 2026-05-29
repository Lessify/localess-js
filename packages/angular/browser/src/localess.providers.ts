import {IMAGE_LOADER, ImageLoaderConfig} from "@angular/common";
import {EnvironmentProviders, makeEnvironmentProviders} from "@angular/core";
import {loadLocalessSync} from '@localess/client';
import {LOCALESS_BROWSER_CONFIG} from "./localess.config";
import {BrowserAssetService} from './services/asset.service';

export type LocalessBrowserOptions = {
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
   * Enable debug mode
   */
  debug?: boolean;
  /**
   * Enable Sync Script Load
   */
  enableSync?: boolean;
};

export function provideLocalessBrowser(options: LocalessBrowserOptions): EnvironmentProviders[] {
  const {origin, spaceId, debug, enableSync} = options;
  if (origin === undefined || origin === '') {
    throw new Error('Localess Origin can\'t be empty');
  }
  if (spaceId === undefined || spaceId === '') {
    throw new Error('Localess Space ID can\'t be empty');
  }
  if (enableSync) {
    if (debug) {
      console.log('[Localess] enableSync', enableSync)
    }
    loadLocalessSync(origin);
  }
  return [
    makeEnvironmentProviders([
      {
        provide: LOCALESS_BROWSER_CONFIG,
        useValue: {
          origin,
          spaceId,
          debug,
          assetPathPrefix: `${options.origin}/api/v1/spaces/${options.spaceId}/assets/`,
        },
      },
      {
        provide: IMAGE_LOADER,
        useValue: (config: ImageLoaderConfig) => {
          if (debug) {
            console.log('[Localess] ImageLoader', config)
          }
          // optimize image for API assets
          if (config.src.startsWith(`${origin}/api/v1/spaces/${spaceId}/assets/`) && config.width) {
            return `${config.src}?w=${config.width}`;
          } else {
            return config.src;
          }
        },
      },
      BrowserAssetService,
    ])
  ];
}
