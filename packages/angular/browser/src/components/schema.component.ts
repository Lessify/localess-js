import {Component, inject} from "@angular/core";
import {LOCALESS_BROWSER_CONFIG} from "../localess.config";
import type {ContentDataSchema, ContentAsset, ContentLink, Links, AssetTransformParams} from "../models";
import {findLink} from "../utils/link.utils";
import {buildAssetQueryString} from "@localess/client";

/**
 * Schema base component
 * @since v0.2.0
 */
@Component({
  selector: 'll-schema-component',
  standalone: true,
  template: '',
  host: {
    '[attr.data-ll-id]': 'content()._id',
    '[attr.data-ll-schema]': 'content()._schema'
  },
})
export abstract class SchemaComponent<T extends ContentDataSchema = ContentDataSchema> {

  config = inject(LOCALESS_BROWSER_CONFIG)

  abstract content(): T;

  assetUrl(asset: ContentAsset, params?: AssetTransformParams): string {
    const base = `${this.config.assetPathPrefix}${asset.uri}`;
    const qs = buildAssetQueryString(params);
    return qs ? `${base}?${qs}` : base;
  }

  findLink(links: Links, link: ContentLink): string {
    return findLink(links, link)
  }
}
