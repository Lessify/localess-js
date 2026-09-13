import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { ApplicationRef, EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';

import { LocalessFeature } from './localess.components';
import { LOCALESS_CONFIG, LOCALESS_SYNC_READY, LocalessConfig } from './localess.config';
import type { AssetTransformParams } from './models';
import { LocalessAssetService } from './services/asset.service';
import { LocalessClientService } from './services/client.service';
import { LocalessComponentResolver } from './services/component-resolver.service';
import { LocalessContentService } from './services/content.service';
import { LocalessSyncService } from './services/sync.service';
import { LocalessTranslationService } from './services/translation.service';
import { buildAssetQueryString, loadLocalessSync } from './utils';

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
  let appStable: (() => void) | undefined = undefined;
  if (options.enableSync) {
    if (options.debug) {
      console.log('[Localess] enableSync', options.enableSync);
    }
    // The script is loaded only once the application is stable, not immediately.
    //
    // The sync script pings the Visual Editor as soon as it runs, and hooks every
    // `[data-ll-id]` element it can see when the editor pongs back. Loading it eagerly races
    // the first render: `LocalessComponentDirective` awaits `LocalessComponentResolver`
    // before calling `createComponent`, so a lazily registered schema component destroys and
    // recreates its server-rendered DOM part-way through that handshake, and any element
    // recreated after the pong stayed unhooked. Waiting for stability moves the handshake
    // past the last render caused by bootstrap.
    const stable = new Promise<void>(resolve => {
      appStable = resolve;
    });
    syncReady = stable
      .then(() => loadLocalessSync(options.origin))
      .catch(error => {
        console.error('[Localess] Failed to load sync script.', error);
      });
  }

  // Aliased to a const so it narrows inside the initializer closure below.
  const notifyAppStable = appStable;

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
          if (!imgConfig.src.startsWith(assetPathPrefix)) {
            return imgConfig.src;
          }
          // `loaderParams` is Angular's per-image channel (the `[loaderParams]` input) and
          // `callImageLoader` injects it into *every* call — including the width-less one that
          // builds the `src` attribute. Honouring it is what lets `ngSrc` reach `q`, `f`, `fit`
          // and `thumbnail`, which `llAsset` and `LocalessAssetService.link()` already support.
          const params: AssetTransformParams = { ...(imgConfig.loaderParams as AssetTransformParams | undefined) };
          // Angular's width wins over any `w` in loaderParams: srcset entries are per-width by
          // definition, and varying it is the entire purpose of the srcset call sites.
          if (imgConfig.width) {
            params.w = imgConfig.width;
          }
          // `imgConfig.height` is deliberately discarded. Angular derives it from the *declared*
          // aspect ratio, and sending both `w` and `h` switches the API from width-only scaling
          // (aspect preserved) to a `fit` crop — silently cropping whenever the declared ratio
          // differs from the source's. A caller who wants a box passes `h` via loaderParams.
          const query = buildAssetQueryString(params);
          return query ? `${imgConfig.src}?${query}` : imgConfig.src;
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
    ...(notifyAppStable
      ? [
          provideAppInitializer(() => {
            const appRef = inject(ApplicationRef);
            // Deliberately not returned: an initializer's promise blocks bootstrap, and the
            // application cannot become stable until bootstrap has finished, so returning
            // this would deadlock.
            void appRef.whenStable().then(notifyAppStable);
          }),
        ]
      : []),
  ];
}
