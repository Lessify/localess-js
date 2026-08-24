import { TestBed } from '@angular/core/testing';

import { LOCALESS_CONFIG, LocalessConfig } from '../localess.config';
import { LocalessClientService } from './client.service';

describe('LocalessClientService', () => {
  const config: LocalessConfig = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

  function createService(): LocalessClientService {
    TestBed.configureTestingModule({
      providers: [LocalessClientService, { provide: LOCALESS_CONFIG, useValue: config }],
    });
    return TestBed.inject(LocalessClientService);
  }

  it('builds an asset link identical to a direct localessClient() call', () => {
    const service = createService();
    expect(service.assetLink('images/logo.png')).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
  });

  it('appends transform params to the asset link', () => {
    const service = createService();
    expect(service.assetLink('images/logo.png', { w: 800 })).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800'
    );
  });
});
