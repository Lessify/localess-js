import {isPlatformBrowser} from '@angular/common';
import {Inject, inject, Injectable, PLATFORM_ID} from '@angular/core';
import {LOCALESS_SERVER_CONFIG} from "../localess.config";
import type {ContentAsset} from "../models";

@Injectable()
export class ServerAssetService {
  config = inject(LOCALESS_SERVER_CONFIG)

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    if (this.config.debug) {
      console.log('[Localess] ServerAssetService', this.config);
    }
    if(isPlatformBrowser(platformId)) {
      console.error('[Localess] ServerAssetService: Please use the service on server side only.');
    }
  }

  /**
   * Convert Asset to URL.
   * @param asset
   */
  link(asset: ContentAsset | string): string {
    if (typeof asset === 'string') {
      return `${this.config.origin}/api/v1/spaces/${this.config.spaceId}/assets/${asset}`;
    } else {
      return `${this.config.origin}/api/v1/spaces/${this.config.spaceId}/assets/${asset.uri}`;
    }
  }
}
