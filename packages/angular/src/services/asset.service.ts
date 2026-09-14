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
   * URL for the stored bytes exactly as uploaded, served inline.
   *
   * `link()` does not return these: a still raster is re-encoded at its format's default quality
   * even with no parameters, so a bare asset URL is a rendition. Takes no transform parameters.
   * @param asset
   */
  originalLink(asset: ContentAsset | string): string {
    return this.client.assetOriginalLink(asset);
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
