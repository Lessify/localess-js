import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_SERVER_CONFIG, LocalessServerConfig } from '../localess.config';
import { ServerAssetService } from './asset.service';

describe('ServerAssetService', () => {
  const config: LocalessServerConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
    assetPathPrefix: 'https://cms.example.com/api/v1/spaces/space-1/assets/',
  };

  function createService(platformId: string): ServerAssetService {
    TestBed.configureTestingModule({
      providers: [
        ServerAssetService,
        { provide: LOCALESS_SERVER_CONFIG, useValue: config },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    return TestBed.inject(ServerAssetService);
  }

  it('builds a link from an asset uri string', () => {
    const service = createService('server');
    expect(service.link('images/logo.png')).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
  });

  it('builds a link from a ContentAsset object', () => {
    const service = createService('server');
    expect(service.link({ kind: 'ASSET', uri: 'images/logo.png' } as any)).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png'
    );
  });

  it('appends transform params as a query string', () => {
    const service = createService('server');
    expect(service.link('images/logo.png', { w: 800 })).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800'
    );
  });

  it('logs an error when used on the browser platform', () => {
    const errorSpy = vi.spyOn(console, 'error');
    createService('browser');
    expect(errorSpy).toHaveBeenCalled();
  });
});
