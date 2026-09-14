import { inject, Injectable } from '@angular/core';

import type { AssetTransformParams, ContentAsset } from '../models';
import { LocalessClientService } from './client.service';

@Injectable()
export class LocalessAssetService {
  private readonly client = inject(LocalessClientService);

  /**
   * Convert Asset to URL with optional image transform parameters.
   * @param asset
   * @param params
   */
  link(asset: ContentAsset | string, params?: AssetTransformParams): string {
    return this.client.assetLink(asset, params);
  }

  /**
   * URL for the stored bytes, served as an attachment so the browser saves rather than
   * displays them. Replaces `link(asset, { download: true })`, removed in v4.
   * @param asset
   */
  downloadLink(asset: ContentAsset | string): string {
    return this.client.assetDownloadLink(asset);
  }
}
