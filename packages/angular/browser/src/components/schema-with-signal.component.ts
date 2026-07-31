import {Component, inject, input} from "@angular/core";
import {LOCALESS_BROWSER_CONFIG} from "../localess.config";
import type {ContentAsset, ContentLink, Links, References, ContentData, Assets, AssetTransformParams} from "../models";
import {buildAssetQueryString, findLink} from "../utils";

/**
 * Schema base component
 * @since v0.5.1
 */
@Component({
  selector: 'll-schema-with-signal-component',
  standalone: true,
  template: '',
  host: {
    '[attr.data-ll-id]': 'data()._id',
    '[attr.data-ll-schema]': 'data()._schema'
  },
})
export abstract class SchemaWithSignalComponent<T extends ContentData = ContentData> {

  config = inject(LOCALESS_BROWSER_CONFIG)

  data = input.required<T>();
  links = input<Links>();
  references = input<References>();
  assets = input<Assets>();

  assetUrl(asset: ContentAsset, params?: AssetTransformParams): string {
    const base = `${this.config.assetPathPrefix}${asset.uri}`;
    const qs = buildAssetQueryString(params);
    return qs ? `${base}?${qs}` : base;
  }

  findLink(link: ContentLink): string {
    return findLink(this.links(), link)
  }
}
