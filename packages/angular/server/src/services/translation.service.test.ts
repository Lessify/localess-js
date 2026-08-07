import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { LOCALESS_SERVER_CONFIG, LocalessServerConfig } from '../localess.config';
import { ServerTranslationService } from './translation.service';

describe('ServerTranslationService', () => {
  const config: LocalessServerConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
    assetPathPrefix: 'https://cms.example.com/api/v1/spaces/space-1/assets/',
  };

  let httpMock: HttpTestingController;

  function createService(platformId: string, overrides: Partial<LocalessServerConfig> = {}): ServerTranslationService {
    TestBed.configureTestingModule({
      providers: [
        ServerTranslationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALESS_SERVER_CONFIG, useValue: { ...config, ...overrides } },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(ServerTranslationService);
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('fetches translations for a locale', () => {
    const service = createService('server');

    let result: unknown;
    service.fetch('en').subscribe(translations => (result = translations));

    const req = httpMock.expectOne(
      req => req.url === 'https://cms.example.com/api/v1/spaces/space-1/translations/en' && req.params.get('token') === 'token-123'
    );
    req.flush({ hello: 'world' });

    expect(result).toEqual({ hello: 'world' });
  });

  it('caches translations for the same locale', () => {
    const service = createService('server');

    service.fetch('en').subscribe();
    httpMock.expectOne(() => true).flush({ hello: 'world' });

    let cached: unknown;
    service.fetch('en').subscribe(translations => (cached = translations));

    httpMock.expectNone(() => true);
    expect(cached).toEqual({ hello: 'world' });
  });

  it('issues separate requests for different locales', () => {
    const service = createService('server');

    service.fetch('en').subscribe();
    httpMock.expectOne(req => req.url.endsWith('/translations/en')).flush({});

    service.fetch('de').subscribe();
    httpMock.expectOne(req => req.url.endsWith('/translations/de')).flush({});
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
