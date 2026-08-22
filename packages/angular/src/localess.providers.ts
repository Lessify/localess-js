import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { loadLocalessSync } from '@localess/client';

import { LocalessFeature } from './localess.components';
import { LOCALESS_CONFIG, LOCALESS_SYNC_READY, LocalessConfig } from './localess.config';
import { LocalessAssetService } from './services/asset.service';
import { LocalessClientService } from './services/client.service';
import { LocalessComponentResolver } from './services/component-resolver.service';
import { LocalessContentService } from './services/content.service';
import { LocalessSyncService } from './services/sync.service';
import { LocalessTranslationService } from './services/translation.service';

export type LocalessOptions = {
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
   * Localess API token. Use a secret token for server-fetched/hydrated content, a public
   * token for content fetched directly in the browser.
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
   * Cache TTL (time to live) in seconds for API responses.
   */
  cacheTTL?: number | false;
};

export function provideLocaless(options: LocalessOptions, ...features: LocalessFeature[]): EnvironmentProviders[] {
  if (options.origin === undefined || options.origin === '') {
    throw new Error("Localess Origin can't be empty");
  }
  if (options.spaceId === undefined || options.spaceId === '') {
    throw new Error("Localess Space ID can't be empty");
  }
  if (options.token === undefined || options.token === '') {
    throw new Error("Localess Token can't be empty");
  }

  const config: LocalessConfig = { ...options };
  const assetPathPrefix = `${options.origin}/api/v1/spaces/${options.spaceId}/assets/`;

  let syncReady: Promise<void> = Promise.resolve();
  if (options.enableSync) {
    if (options.debug) {
      console.log('[Localess] enableSync', options.enableSync);
    }
    syncReady = loadLocalessSync(options.origin).catch(error => {
      console.error('[Localess] Failed to load sync script.', error);
    });
  }

  return [
    makeEnvironmentProviders([
      {
        provide: LOCALESS_CONFIG,
        useValue: config,
      },
      {
        provide: LOCALESS_SYNC_READY,
        useValue: syncReady,
      },
      {
        provide: IMAGE_LOADER,
        useValue: (imgConfig: ImageLoaderConfig) => {
          if (config.debug) {
            console.log('[Localess] ImageLoader', imgConfig);
          }
          if (imgConfig.src.startsWith(assetPathPrefix) && imgConfig.width) {
            return `${imgConfig.src}?w=${imgConfig.width}`;
          }
          return imgConfig.src;
        },
      },
      LocalessClientService,
      LocalessAssetService,
      LocalessTranslationService,
      LocalessContentService,
      LocalessSyncService,
      LocalessComponentResolver,
      ...features.flatMap(feature => feature.ɵproviders),
    ]),
  ];
}
