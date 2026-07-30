import {isPlatformBrowser} from '@angular/common';
import {Inject, inject, Injectable, PLATFORM_ID} from '@angular/core';
import {buildAssetQueryString} from '@localess/client';
import {LOCALESS_SERVER_CONFIG} from "../localess.config";
import type {AssetTransformParams, ContentAsset} from "../models";

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
   * Convert Asset to URL with optional image transform parameters.
   * @param asset
   * @param params
   */
  link(asset: ContentAsset | string, params?: AssetTransformParams): string {
    const uri = typeof asset === 'string' ? asset : asset.uri;
    const qs = buildAssetQueryString(params);
    const base = `${this.config.assetPathPrefix}${uri}`;
    return qs ? `${base}?${qs}` : base;
  }
}
