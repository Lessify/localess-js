import { inject, Pipe, PipeTransform } from '@angular/core';
import type { AssetTransformParams, ContentAsset } from '@localess/client';
import { LocalessClientService } from '../services/client.service';

@Pipe({
  name: 'llAsset',
  standalone: true,
})
export class AssetPipe implements PipeTransform {
  private readonly client = inject(LocalessClientService);

  /**
   * Convert Asset to URL with optional image transform parameters.
   * @param asset
   * @param params
   */
  transform(asset: ContentAsset, params?: AssetTransformParams): string {
    return this.client.assetLink(asset, params);
  }
}
