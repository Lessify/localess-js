import { Injectable, makeStateKey } from '@angular/core';
import {Content, Links, ContentData} from '@localess/angular';
import { Observable } from 'rxjs';

@Injectable()
export abstract class LocalessService {
  LINKS_KEY = makeStateKey<Links>('ll:links');

  abstract getLinks(): Observable<Links>;

  abstract getContentById<T extends ContentData = ContentData>(id: string, locale?: string): Observable<Content<T>>;

  abstract getContentBySlug<T extends ContentData = ContentData>(slug: string | string[], locale?: string): Observable<Content<T>>;
}
