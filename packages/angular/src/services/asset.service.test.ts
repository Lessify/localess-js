import { TestBed } from '@angular/core/testing';

import { LOCALESS_CONFIG, LocalessConfig } from '../localess.config';
import { LocalessAssetService } from './asset.service';
import { LocalessClientService } from './client.service';

describe('LocalessAssetService', () => {
  const config: LocalessConfig = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

  function createService(): LocalessAssetService {
    TestBed.configureTestingModule({
      providers: [LocalessAssetService, LocalessClientService, { provide: LOCALESS_CONFIG, useValue: config }],
    });
    return TestBed.inject(LocalessAssetService);
  }

  it('builds a URL from the origin, space id, and asset uri', () => {
    const service = createService();
    expect(service.link('images/logo.png')).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
  });

  it('accepts a ContentAsset object', () => {
    const service = createService();
    expect(service.link({ kind: 'ASSET', uri: 'images/logo.png' } as never)).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png'
    );
  });

  it('appends transform params as a query string', () => {
    const service = createService();
    expect(service.link('images/logo.png', { w: 800, h: 600 })).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800&h=600'
    );
  });
});
