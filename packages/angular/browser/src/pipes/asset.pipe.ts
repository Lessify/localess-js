import {Inject, Pipe, PipeTransform} from "@angular/core";
import type {ContentAsset} from "../models";
import {LOCALESS_BROWSER_CONFIG, LocalessBrowserConfig} from "../localess.config";

@Pipe({
  name: 'llAsset',
  standalone: true
})
export class AssetPipe implements PipeTransform {

  constructor(
    @Inject(LOCALESS_BROWSER_CONFIG) readonly config: LocalessBrowserConfig
  ) {
  }

  transform(asset: ContentAsset): string {
    return `${this.config.assetPathPrefix}${asset.uri}`;
  }
}
