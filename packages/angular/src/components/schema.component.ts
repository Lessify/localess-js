import { Component, inject, input } from '@angular/core';

import type { Assets, AssetTransformParams, ContentAsset, ContentData, ContentLink, Links, References } from '../models';
import { LocalessClientService } from '../services/client.service';
import { findLink } from '../utils';

/**
 * Schema base component
 * @since v0.5.1
 */
@Component({
  selector: 'll-schema-component',
  standalone: true,
  template: '',
  host: {
    '[attr.data-ll-id]': 'data()._id',
    '[attr.data-ll-schema]': 'data()._schema',
  },
})
export abstract class SchemaComponent<T extends ContentData = ContentData> {
  private readonly client = inject(LocalessClientService);

  data = input.required<T>();
  links = input<Links>();
  references = input<References>();
  assets = input<Assets>();

  assetUrl(asset: ContentAsset, params?: AssetTransformParams): string {
    return this.client.assetLink(asset, params);
  }

  findLink(link: ContentLink): string {
    return findLink(this.links(), link);
  }
}
