import { isPlatformServer } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, StateKey, TransferState } from '@angular/core';

import type { Content, ContentData, ContentFetchParams, Links, LinksFetchParams } from '../models';
import { LocalessClientService } from './client.service';

@Injectable()
export class LocalessContentService {
  private readonly client = inject(LocalessClientService);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Fetches content by slug, hydrating from `TransferState` on the browser when the same slug
   * was already fetched server-side, and falling back to a direct client call otherwise (pure
   * client-side-rendered apps using a public token, or any client-side navigation after the
   * first hydration).
   */
  contentBySlug<T extends ContentData = ContentData>(slug: string, params?: ContentFetchParams): Promise<Content<T>> {
    return this.loadAndHydrate(makeStateKey<Content<T>>(`ll:content:slug:${slug}`), () => this.client.getContentBySlug<T>(slug, params));
  }

  /**
   * Fetches content by ID, with the same `TransferState` hydration behavior as {@link contentBySlug}.
   */
  contentById<T extends ContentData = ContentData>(id: string, params?: ContentFetchParams): Promise<Content<T>> {
    return this.loadAndHydrate(makeStateKey<Content<T>>(`ll:content:id:${id}`), () => this.client.getContentById<T>(id, params));
  }

  /**
   * Fetches the links map, with the same `TransferState` hydration behavior as {@link contentBySlug}.
   */
  links(params?: LinksFetchParams): Promise<Links> {
    const key = makeStateKey<Links>(`ll:links:${JSON.stringify(params ?? {})}`);
    return this.loadAndHydrate(key, () => this.client.getLinks(params));
  }

  private async loadAndHydrate<T>(key: StateKey<T>, load: () => Promise<T>): Promise<T> {
    if (this.transferState.hasKey(key)) {
      const value = this.transferState.get(key, undefined as unknown as T);
      this.transferState.remove(key);
      return value;
    }
    const value = await load();
    if (isPlatformServer(this.platformId)) {
      this.transferState.set(key, value);
    }
    return value;
  }
}
