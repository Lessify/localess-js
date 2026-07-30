import { AssetPipe } from './asset.pipe';
import { LOCALESS_BROWSER_CONFIG, LocalessBrowserConfig } from '../localess.config';
import type { ContentAsset } from '../models';

describe('AssetPipe', () => {
  const config: LocalessBrowserConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    assetPathPrefix: 'https://cms.example.com/api/v1/spaces/space-1/assets/',
  };
  const asset: ContentAsset = { kind: 'ASSET', uri: 'images/logo.png' } as ContentAsset;

  function createPipe(): AssetPipe {
    return new AssetPipe(config);
  }

  it('builds a URL from the asset path prefix and asset uri', () => {
    const pipe = createPipe();
    expect(pipe.transform(asset)).toBe('https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png');
  });

  it('appends transform params as a query string', () => {
    const pipe = createPipe();
    expect(pipe.transform(asset, { w: 800, h: 600 })).toBe(
      'https://cms.example.com/api/v1/spaces/space-1/assets/images/logo.png?w=800&h=600'
    );
  });

  it('provides the injection token used to resolve the config', () => {
    expect(LOCALESS_BROWSER_CONFIG).toBeTruthy();
  });
});
