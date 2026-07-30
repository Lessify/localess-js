import {inject, Pipe, PipeTransform} from "@angular/core";
import {buildAssetQueryString} from '@localess/client';
import type {AssetTransformParams, ContentAsset} from "../models";
import {LOCALESS_BROWSER_CONFIG} from "../localess.config";

@Pipe({
  name: 'llAsset',
  standalone: true
})
export class AssetPipe implements PipeTransform {
  config = inject(LOCALESS_BROWSER_CONFIG)

  /**
   * Convert Asset to URL with optional image transform parameters.
   * @param asset
   * @param params
   */
  transform(asset: ContentAsset, params?: AssetTransformParams): string {
    const base = `${this.config.assetPathPrefix}${asset.uri}`;
    const qs = buildAssetQueryString(params);
    return qs ? `${base}?${qs}` : base;
  }
}
