import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_BROWSER_CONFIG, LocalessBrowserConfig } from '../localess.config';
import { BrowserAssetService } from './asset.service';

describe('BrowserAssetService', () => {
  const config: LocalessBrowserConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    assetPathPrefix: 'https://cms.example.com/api/v1/spaces/space-1/assets/',
  };

  function createService(platformId: string): BrowserAssetService {
    TestBed.configureTestingModule({
      providers: [
        BrowserAssetService,
        { provide: LOCALESS_BROWSER_CONFIG, useValue: config },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    return TestBed.inject(BrowserAssetService);
  }

  it('builds a link from an asset uri string', () => {
    const service = createService('browser');
    expect(service.link('images/logo.png')).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
  });

  it('builds a link from a ContentAsset object', () => {
    const service = createService('browser');
    expect(service.link({ kind: 'ASSET', uri: 'images/logo.png' } as any)).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png'
    );
  });

  it('appends transform params as a query string', () => {
    const service = createService('browser');
    expect(service.link('images/logo.png', { w: 800 })).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800'
    );
  });

  it('logs an error when used on the server platform', () => {
    const errorSpy = vi.spyOn(console, 'error');
    createService('server');
    expect(errorSpy).toHaveBeenCalled();
  });
});
