import {Component, inject} from "@angular/core";
import {LOCALESS_BROWSER_CONFIG} from "../localess.config";
import type {ContentDataSchema, ContentAsset, ContentLink, Links} from "../models";
import {findLink} from "../utils/link.utils";

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
    '[attr.data-ll-schema]': 'content()._schema || content().schema'
  },
})
export abstract class SchemaComponent<T extends ContentDataSchema = ContentDataSchema> {

  config = inject(LOCALESS_BROWSER_CONFIG)

  abstract content(): T;

  assetUrl(asset: ContentAsset): string {
    return this.config.assetPathPrefix + asset.uri;
  }

  findLink(links: Links, link: ContentLink): string {
    return findLink(links, link)
  }
}
