import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { LOCALESS_SERVER_CONFIG, LocalessServerConfig } from '../localess.config';
import { ServerContentService } from './content.service';

describe('ServerContentService', () => {
  const config: LocalessServerConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
    assetPathPrefix: 'https://cms.example.com/api/v1/spaces/space-1/assets/',
  };

  let httpMock: HttpTestingController;

  function createService(platformId: string, overrides: Partial<LocalessServerConfig> = {}): ServerContentService {
    TestBed.configureTestingModule({
      providers: [
        ServerContentService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALESS_SERVER_CONFIG, useValue: { ...config, ...overrides } },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(ServerContentService);
  }

  afterEach(() => {
    httpMock?.verify();
  });

  describe('getLinks', () => {
    it('sends kind, parentSlug and excludeChildren as query params', () => {
      const service = createService('server');

      service.getLinks({ kind: 'DOCUMENT', parentSlug: 'legal/policy', excludeChildren: true }).subscribe();

      const req = httpMock.expectOne(
        req =>
          req.url === 'https://cms.example.com/api/v1/spaces/space-1/links' &&
          req.params.get('token') === 'token-123' &&
          req.params.get('kind') === 'DOCUMENT' &&
          req.params.get('parentSlug') === 'legal/policy' &&
          req.params.get('excludeChildren') === 'true'
      );
      req.flush({ items: [] });
    });

    it('caches links for identical parameters', () => {
      const service = createService('server');

      service.getLinks({ kind: 'DOCUMENT' }).subscribe();
      httpMock.expectOne(() => true).flush({ items: [] });

      let cached: unknown;
      service.getLinks({ kind: 'DOCUMENT' }).subscribe(links => (cached = links));

      httpMock.expectNone(() => true);
      expect(cached).toEqual({ items: [] });
    });

    it('issues a new request when parameters differ', () => {
      const service = createService('server');

      service.getLinks({ kind: 'DOCUMENT' }).subscribe();
      httpMock.expectOne(req => req.params.get('kind') === 'DOCUMENT').flush({ items: [] });

      service.getLinks({ kind: 'FOLDER' }).subscribe();
      httpMock.expectOne(req => req.params.get('kind') === 'FOLDER').flush({ items: [] });
    });
  });

  describe('getContentBySlug', () => {
    it('sends locale and resolve params', () => {
      const service = createService('server');

      service.getContentBySlug('home', { locale: 'en', resolveReference: true, resolveLink: true, resolveAsset: true }).subscribe();

      const req = httpMock.expectOne(
        req =>
          req.url === 'https://cms.example.com/api/v1/spaces/space-1/contents/slugs/home' &&
          req.params.get('locale') === 'en' &&
          req.params.get('resolveReference') === 'true' &&
          req.params.get('resolveLink') === 'true' &&
          req.params.get('resolveAsset') === 'true'
      );
      req.flush({ _id: 'c1' });
    });

    it('uses the config-level version when no param version is given', () => {
      const service = createService('server', { version: 'draft' });

      service.getContentBySlug('home').subscribe();

      const req = httpMock.expectOne(req => req.params.get('version') === 'draft');
      req.flush({ _id: 'c1' });
    });

    it('lets the param version override the config-level version', () => {
      const service = createService('server', { version: 'draft' });

      service.getContentBySlug('home', { version: 'draft' }).subscribe();

      const req = httpMock.expectOne(req => req.params.get('version') === 'draft');
      req.flush({ _id: 'c1' });
    });

    it('caches content for the same slug and parameters', () => {
      const service = createService('server');

      service.getContentBySlug('home', { locale: 'en' }).subscribe();
      httpMock.expectOne(() => true).flush({ _id: 'c1' });

      let cached: unknown;
      service.getContentBySlug('home', { locale: 'en' }).subscribe(content => (cached = content));

      httpMock.expectNone(() => true);
      expect(cached).toEqual({ _id: 'c1' });
    });

    it('does not reuse the cache when the slug differs', () => {
      const service = createService('server');

      service.getContentBySlug('home').subscribe();
      httpMock.expectOne(req => req.url.endsWith('/slugs/home')).flush({ _id: 'c1' });

      service.getContentBySlug('about').subscribe();
      httpMock.expectOne(req => req.url.endsWith('/slugs/about')).flush({ _id: 'c2' });
    });

    it('does not reuse the cache when resolveAsset differs', () => {
      const service = createService('server');

      service.getContentBySlug('home').subscribe();
      httpMock.expectOne(() => true).flush({ _id: 'c1' });

      service.getContentBySlug('home', { resolveAsset: true }).subscribe();
      httpMock.expectOne(req => req.params.get('resolveAsset') === 'true').flush({ _id: 'c1-resolved' });
    });
  });

  describe('getContentById', () => {
    it('sends locale and resolve params', () => {
      const service = createService('server');

      service.getContentById('c1', { locale: 'de', resolveAsset: true }).subscribe();

      const req = httpMock.expectOne(
        req =>
          req.url === 'https://cms.example.com/api/v1/spaces/space-1/contents/c1' &&
          req.params.get('locale') === 'de' &&
          req.params.get('resolveAsset') === 'true'
      );
      req.flush({ _id: 'c1' });
    });

    it('caches content for the same id and parameters', () => {
      const service = createService('server');

      service.getContentById('c1').subscribe();
      httpMock.expectOne(() => true).flush({ _id: 'c1' });

      let cached: unknown;
      service.getContentById('c1').subscribe(content => (cached = content));

      httpMock.expectNone(() => true);
      expect(cached).toEqual({ _id: 'c1' });
    });

    it('does not reuse the cache when the id differs', () => {
      const service = createService('server');

      service.getContentById('c1').subscribe();
      httpMock.expectOne(req => req.url.endsWith('/contents/c1')).flush({ _id: 'c1' });

      service.getContentById('c2').subscribe();
      httpMock.expectOne(req => req.url.endsWith('/contents/c2')).flush({ _id: 'c2' });
    });
  });

  it('logs an error when used on the browser platform', () => {
    const errorSpy = vi.spyOn(console, 'error');
    createService('browser');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs debug information when debug is enabled', () => {
    const logSpy = vi.spyOn(console, 'log');
    createService('server', { debug: true });
    expect(logSpy).toHaveBeenCalled();
  });
});
