import {isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Inject, inject, Injectable, PLATFORM_ID} from '@angular/core';
import {Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {LOCALESS_SERVER_CONFIG} from "../localess.config";
import type {Translations} from "../models";

@Injectable()
export class ServerTranslationService {
  config = inject(LOCALESS_SERVER_CONFIG)
  private translationsCache = new Map<string, Translations>();

  constructor(
    private readonly httpClient: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    if (this.config.debug) {
      console.log('[Localess] ServerTranslationService', this.config);
    }
    if(isPlatformBrowser(platformId)) {
      console.error('[Localess] ServerTranslationService: Please use the service on server side only.');
    }
  }

  /**
   * Retrieve all Translations by Localess.
   * Results are cached by locale to avoid redundant network requests.
   */
  fetch(locale: string): Observable<Translations> {
    // Check if translations for this locale are already in the cache
    if (this.translationsCache.has(locale)) {
      if (this.config.debug) {
        console.log(`[Localess] ServerTranslationService: Using cached translations for locale '${locale}'`);
      }
      return of(this.translationsCache.get(locale)!);
    }

    // If not in cache, fetch from API and store in cache
    let url = `${this.config.origin}/api/v1/spaces/${this.config.spaceId}/translations/${locale}`;
    return this.httpClient.get<Translations>(url, {params: {token: this.config.token}})
      .pipe(
        tap(translations => {
          if (this.config.debug) {
            console.log(`[Localess] ServerTranslationService: Caching translations for locale '${locale}'`);
          }
          this.translationsCache.set(locale, translations);
        })
      );
  }
}
