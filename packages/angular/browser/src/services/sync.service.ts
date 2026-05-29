import {isPlatformServer} from '@angular/common';
import {Inject, inject, Injectable, PLATFORM_ID} from '@angular/core';
import {LOCALESS_BROWSER_CONFIG} from "../localess.config";
import type {ContentAsset} from "../models";

@Injectable()
export class BrowserSyncService {
  config = inject(LOCALESS_BROWSER_CONFIG)
  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    if (this.config.debug) {
      console.log('[Localess] BrowserSyncService', this.config);
    }
    if(isPlatformServer(platformId)) {
      console.error('[Localess] BrowserSyncService: Please use the service on browser side only.');
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
