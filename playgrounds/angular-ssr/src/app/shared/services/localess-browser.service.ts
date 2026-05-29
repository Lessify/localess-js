import { Inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import {Content, ContentData, Links} from '@localess/angular';
import { Observable, of } from 'rxjs';
import {LocalessService} from './localess.service';

@Injectable()
export class LocalessBrowserService extends LocalessService {
  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: unknown,
    private state: TransferState,
  ) {
    super();
  }

  getLinks(): Observable<Links> {
    console.log('fetchLinks', this.platformId);
    return of(this.state.get(this.LINKS_KEY, {}));
  }

  getContentById<T extends ContentData = ContentData>(id: string, locale?: string): Observable<Content<T>> {
    console.log('fetchDocumentById', id, this.platformId);
    const key = makeStateKey<Content<T>>(`ll:content:id:${id}`);
    if (this.state.hasKey(key)) {
      return of(
        this.state.get(key, {
          id: '',
          kind: 'DOCUMENT',
          slug: '',
          fullSlug: '',
          parentSlug: '',
          name: '',
          createdAt: '',
          updatedAt: '',
          publishedAt: '',
        }),
      );
    }
    return of();
  }

  getContentBySlug<T extends ContentData = ContentData>(slug: string | string[], locale?: string): Observable<Content<T>> {
    let normalizedSlug: string;
    if (Array.isArray(slug)) {
      normalizedSlug = slug.join('/');
    } else {
      normalizedSlug = slug;
    }
    console.log('fetchDocumentBySlug', normalizedSlug, this.platformId);
    const key = makeStateKey<Content<T>>(`ll:content:slug:${normalizedSlug}`);
    if (this.state.hasKey(key)) {
      return of(
        this.state.get(key, {
          id: '',
          kind: 'DOCUMENT',
          slug: '',
          fullSlug: '',
          parentSlug: '',
          name: '',
          createdAt: '',
          updatedAt: '',
          publishedAt: '',
        }),
      );
    }
    return of();
  }
}
