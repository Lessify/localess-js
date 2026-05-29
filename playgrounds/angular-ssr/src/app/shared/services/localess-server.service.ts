import {Inject, Injectable, makeStateKey, PLATFORM_ID, TransferState} from '@angular/core';
import {Content, ContentData, Links} from '@localess/angular';
import {ServerContentService} from '@localess/angular/server';
import {Observable, tap} from 'rxjs';
import {LocalessService} from './localess.service';

@Injectable()
export class LocalessServerService extends LocalessService {

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: unknown,
    private state: TransferState,
    private readonly contentsService: ServerContentService,
  ) {
    super();
  }

  getLinks(): Observable<Links> {
    console.log('fetchLinks', this.platformId);
    return this.contentsService
      .getLinks()
      .pipe(tap(links => this.state.set(this.LINKS_KEY, links)));
  }

  getContentById<T extends ContentData = ContentData>(id: string, locale?: string): Observable<Content<T>> {
    console.log('fetchDocumentById', id, locale, this.platformId);
    return this.contentsService
      .getContentById<T>(id, {locale: locale})
      .pipe(tap(content => this.state.set(makeStateKey<Content<T>>(`ll:content:id:${id}`), content)));
  }

  getContentBySlug<T extends ContentData = ContentData>(slug: string | string[], locale?: string): Observable<Content<T>> {
    let normalizedSlug: string;
    if (Array.isArray(slug)) {
      normalizedSlug = slug.join('/');
    } else {
      normalizedSlug = slug;
    }
    console.log('fetchDocumentBySlug', normalizedSlug, locale, this.platformId);
    return this.contentsService
      .getContentBySlug<T>(normalizedSlug, {locale: locale})
      .pipe(tap(content => this.state.set(makeStateKey<Content<T>>(`ll:content:slug:${normalizedSlug}`), content)));
  }
}
