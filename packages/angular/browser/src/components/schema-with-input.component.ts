import {Component, inject, Input} from "@angular/core";
import {LOCALESS_BROWSER_CONFIG} from "../localess.config";
import type {ContentAsset, ContentLink, Links, ContentData, References} from "../models";
import {findLink} from "../utils/link.utils";

/**
 * Schema base component
 * @since v0.5.1
 */
@Component({
  selector: 'll-schema-with-input-component',
  standalone: true,
  template: '',
  host: {
    '[attr.data-ll-id]': 'data._id',
    '[attr.data-ll-schema]': 'data._schema || data.schema'
  },
})
export abstract class SchemaWithInputComponent<T extends ContentData = ContentData> {

  config = inject(LOCALESS_BROWSER_CONFIG)

  @Input({required: true})
  data!: T;
  @Input({required: false})
  links?: Links;
  @Input({required: false})
  references?: References;

  assetUrl(asset: ContentAsset): string {
    return this.config.assetPathPrefix + asset.uri;
  }

  findLink(link: ContentLink): string {
    return findLink(this.links, link)
  }
}
