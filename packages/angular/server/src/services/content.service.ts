import {isPlatformBrowser} from '@angular/common';
import {Inject, inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {LOCALESS_SERVER_CONFIG} from "../localess.config";
import type {Content, Links, ContentFetchParams, LinksFetchParams, ContentData} from "../models";

interface ClientParams {
  [param: string]: string | boolean
}

@Injectable()
export class ServerContentService {
  config = inject(LOCALESS_SERVER_CONFIG)
  private linksCache = new Map<string, Links>();
  private contentBySlugCache = new Map<string, Content>();
  private contentByIdCache = new Map<string, Content>();

  constructor(
    private readonly httpClient: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    if (this.config.debug) {
      console.log('[Localess] ServerContentService', this.config);
    }
    if(isPlatformBrowser(platformId)) {
      console.error('[Localess] ServerContentService: Please use the service on server side only.');
    }
  }

  /**
   * Get all links
   * Results are cached by parameters to avoid redundant network requests.
   * @returns {Observable<Links>}
   */
  getLinks(params?: LinksFetchParams): Observable<Links> {
    // Create a cache key based on the parameters
    const cacheKey = this.createLinksCacheKey(params);

    // Check if links for these parameters are already in the cache
    if (this.linksCache.has(cacheKey)) {
      if (this.config.debug) {
        console.log(`[Localess] ServerContentService: Using cached links for key '${cacheKey}'`);
      }
      return of(this.linksCache.get(cacheKey)!);
    }

    // If not in cache, fetch from API and store in cache
    let url = `${this.config.origin}/api/v1/spaces/${this.config.spaceId}/links`;
    const clientParams: ClientParams = {}
    if (params?.kind) {
      clientParams['kind'] = params.kind;
    }
    if (params?.parentSlug) {
      clientParams['parentSlug'] = params.parentSlug;
    }
    if (params?.excludeChildren) {
      clientParams['excludeChildren'] = params.excludeChildren;
    }
    if (this.config.debug) {
      console.log('[Localess] getLinks', url, clientParams);
    }
    return this.httpClient.get<Links>(url, {
      params: {
        token: this.config.token,
        ...clientParams
      }
    }).pipe(
      tap(links => {
        if (this.config.debug) {
          console.log(`[Localess] ServerContentService: Caching links for key '${cacheKey}'`);
        }
        this.linksCache.set(cacheKey, links);
      })
    );
  }

  /**
   * Creates a cache key for links based on the parameters
   * @private
   */
  private createLinksCacheKey(params?: LinksFetchParams): string {
    const parts: string[] = [];

    if (params?.kind) {
      parts.push(`kind=${params.kind}`);
    }
    if (params?.parentSlug) {
      parts.push(`parentSlug=${params.parentSlug}`);
    }
    if (params?.excludeChildren) {
      parts.push(`excludeChildren=${params.excludeChildren}`);
    }

    return parts.length > 0 ? parts.join('&') : 'default';
  }

  /**
   * Get content by SLUG
   * Results are cached by slug and parameters to avoid redundant network requests.
   * @param slug{string} - Content SLUG
   * @param params{ContentFetchParams} - Fetch parameters
   * @returns {Observable<Content>}
   */
  getContentBySlug<T extends ContentData = ContentData>(slug: string, params?: ContentFetchParams): Observable<Content<T>> {
    // Create a cache key based on the slug and parameters
    const cacheKey = this.createContentBySlugCacheKey(slug, params);

    // Check if content for this slug and parameters is already in the cache
    if (this.contentBySlugCache.has(cacheKey)) {
      if (this.config.debug) {
        console.log(`[Localess] ServerContentService: Using cached content for slug '${slug}' with key '${cacheKey}'`);
      }
      return of(this.contentBySlugCache.get(cacheKey) as Content<T>);
    }

    // If not in cache, fetch from API and store in cache
    let url = `${this.config.origin}/api/v1/spaces/${this.config.spaceId}/contents/slugs/${slug}`;
    const clientParams: ClientParams = {}
    // Config
    if (this.config.version && this.config.version == 'draft') {
      clientParams['version'] = this.config.version;
    }
    // Params
    if (params?.version && params.version == 'draft') {
      clientParams['version'] = params.version;
    }
    if (params?.locale) {
      clientParams['locale'] = params.locale;
    }
    if (params?.resolveReference) {
      clientParams['resolveReference'] = params.resolveReference;
    }
    if (params?.resolveLink) {
      clientParams['resolveLink'] = params.resolveLink;
    }
    if (this.config.debug) {
      console.log('[Localess] getContentBySlug', url, clientParams);
    }
    return this.httpClient.get<Content<T>>(url, {
      params: {
        token: this.config.token,
        ...clientParams,
      }
    }).pipe(
      tap(content => {
        if (this.config.debug) {
          console.log(`[Localess] ServerContentService: Caching content for slug '${slug}' with key '${cacheKey}'`);
        }
        this.contentBySlugCache.set(cacheKey, content);
      })
    );
  }

  /**
   * Creates a cache key for content by slug based on the slug and parameters
   * @private
   */
  private createContentBySlugCacheKey(slug: string, params?: ContentFetchParams): string {
    const parts: string[] = [`slug=${slug}`];

    // Add version from config or params
    const version = params?.version || this.config.version;
    if (version && version === 'draft') {
      parts.push(`version=${version}`);
    }

    // Add locale if present
    if (params?.locale) {
      parts.push(`locale=${params.locale}`);
    }
    if (params?.resolveReference) {
      parts.push(`resolveReference=${params.resolveReference}`);
    }
    if (params?.resolveLink) {
      parts.push(`resolveLink=${params.resolveLink}`);
    }
    return parts.join('&');
  }

  /**
   * Get content by ID
   * Results are cached by ID and parameters to avoid redundant network requests.
   * @param id{string} - Content ID
   * @param params{ContentFetchParams} - Fetch parameters
   * @returns {Observable<Content>}
   */
  getContentById<T extends ContentData = ContentData>(id: string, params?: ContentFetchParams): Observable<Content<T>> {
    // Create a cache key based on the ID and parameters
    const cacheKey = this.createContentByIdCacheKey(id, params);

    // Check if content for this ID and parameters is already in the cache
    if (this.contentByIdCache.has(cacheKey)) {
      if (this.config.debug) {
        console.log(`[Localess] ServerContentService: Using cached content for ID '${id}' with key '${cacheKey}'`);
      }
      return of(this.contentByIdCache.get(cacheKey) as Content<T>);
    }

    // If not in cache, fetch from API and store in cache
    let url = `${this.config.origin}/api/v1/spaces/${this.config.spaceId}/contents/${id}`;
    const clientParams: ClientParams = {}
    // Config
    if (this.config.version && this.config.version == 'draft') {
      clientParams['version'] = this.config.version;
    }
    // Params
    if (params?.version && params.version == 'draft') {
      clientParams['version'] = params.version;
    }
    if (params?.locale) {
      clientParams['locale'] = params.locale;
    }
    if (params?.resolveReference) {
      clientParams['resolveReference'] = params.resolveReference;
    }
    if (params?.resolveLink) {
      clientParams['resolveLink'] = params.resolveLink;
    }
    if (this.config.debug) {
      console.log('[Localess] getContentById', url, clientParams);
    }
    return this.httpClient.get<Content<T>>(url, {
      params: {
        token: this.config.token,
        ...clientParams
      }
    }).pipe(
      tap(content => {
        if (this.config.debug) {
          console.log(`[Localess] ServerContentService: Caching content for ID '${id}' with key '${cacheKey}'`);
        }
        this.contentByIdCache.set(cacheKey, content);
      })
    );
  }

  /**
   * Creates a cache key for content by ID based on the ID and parameters
   * @private
   */
  private createContentByIdCacheKey(id: string, params?: ContentFetchParams): string {
    const parts: string[] = [`id=${id}`];

    // Add version from config or params
    const version = params?.version || this.config.version;
    if (version && version === 'draft') {
      parts.push(`version=${version}`);
    }

    // Add locale if present
    if (params?.locale) {
      parts.push(`locale=${params.locale}`);
    }
    if (params?.resolveReference) {
      parts.push(`resolveReference=${params.resolveReference}`);
    }
    if (params?.resolveLink) {
      parts.push(`resolveLink=${params.resolveLink}`);
    }

    return parts.join('&');
  }
}
