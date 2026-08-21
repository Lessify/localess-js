import { inject, Injectable } from '@angular/core';
import type { AssetTransformParams, ContentAsset } from '@localess/client';
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
}
