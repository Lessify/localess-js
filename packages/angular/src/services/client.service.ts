import { inject, Injectable } from '@angular/core';
import {
  AssetTransformParams,
  Content,
  ContentAsset,
  ContentData,
  ContentFetchParams,
  Links,
  LinksFetchParams,
  localessClient,
  TranslationFetchParams,
  Translations,
} from '@localess/client';

import { LOCALESS_CONFIG } from '../localess.config';

@Injectable()
export class LocalessClientService {
  private readonly config = inject(LOCALESS_CONFIG);
  private readonly client = localessClient({
    origin: this.config.origin,
    spaceId: this.config.spaceId,
    token: this.config.token,
    version: this.config.version,
    debug: this.config.debug,
    cacheTTL: this.config.cacheTTL,
  });

  getLinks(params?: LinksFetchParams): Promise<Links> {
    return this.client.getLinks(params);
  }

  getContentBySlug<T extends ContentData = ContentData>(slug: string, params?: ContentFetchParams): Promise<Content<T>> {
    return this.client.getContentBySlug<T>(slug, params);
  }

  getContentById<T extends ContentData = ContentData>(id: string, params?: ContentFetchParams): Promise<Content<T>> {
    return this.client.getContentById<T>(id, params);
  }

  getTranslations(locale: string, params?: TranslationFetchParams): Promise<Translations> {
    return this.client.getTranslations(locale, params);
  }

  assetLink(asset: ContentAsset | string, params?: AssetTransformParams): string {
    return this.client.assetLink(asset, params);
  }
}
