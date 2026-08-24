import { TestBed } from '@angular/core/testing';
import type { ContentAsset } from '@localess/client';
import { vi } from 'vitest';

import { LocalessClientService } from '../services/client.service';
import { AssetPipe } from './asset.pipe';

describe('AssetPipe', () => {
  const asset: ContentAsset = { kind: 'ASSET', uri: 'images/logo.png' } as ContentAsset;

  function createPipe(
    assetLink = vi.fn().mockReturnValue('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png')
  ): AssetPipe {
    TestBed.configureTestingModule({
      providers: [AssetPipe, { provide: LocalessClientService, useValue: { assetLink } }],
    });
    return TestBed.inject(AssetPipe);
  }

  it('delegates to LocalessClientService.assetLink', () => {
    const assetLink = vi.fn().mockReturnValue('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
    const pipe = createPipe(assetLink);

    expect(pipe.transform(asset)).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
    expect(assetLink).toHaveBeenCalledWith(asset, undefined);
  });

  it('forwards transform params', () => {
    const assetLink = vi.fn().mockReturnValue('...');
    const pipe = createPipe(assetLink);

    pipe.transform(asset, { w: 800, h: 600 });

    expect(assetLink).toHaveBeenCalledWith(asset, { w: 800, h: 600 });
  });
});
