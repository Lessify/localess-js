import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { SchemaComponent } from './components/schema.component';
import { LOCALESS_COMPONENTS, withLocalessComponents } from './localess.components';
import { LOCALESS_SYNC_READY } from './localess.config';
import { provideLocaless } from './localess.providers';

type ImageLoaderFn = (config: ImageLoaderConfig) => string;

@Component({ selector: 'll-test-hero', template: '' })
class HeroComponent extends SchemaComponent {}

describe('provideLocaless', () => {
  const validOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

  it('throws when origin is missing', () => {
    expect(() => provideLocaless({ ...validOptions, origin: '' })).toThrowError("Localess Origin can't be empty");
  });

  it('throws when spaceId is missing', () => {
    expect(() => provideLocaless({ ...validOptions, spaceId: '' })).toThrowError("Localess Space ID can't be empty");
  });

  it('throws when token is missing', () => {
    expect(() => provideLocaless({ ...validOptions, token: '' })).toThrowError("Localess Token can't be empty");
  });

  it('returns providers when options are valid', () => {
    const providers = provideLocaless(validOptions);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('registers components supplied via withLocalessComponents', () => {
    TestBed.configureTestingModule({
      providers: [provideLocaless(validOptions, withLocalessComponents({ hero: HeroComponent }))],
    });

    expect(TestBed.inject(LOCALESS_COMPONENTS)).toEqual({ hero: HeroComponent });
  });

  it('does not inject the sync script when enableSync is not set', () => {
    TestBed.configureTestingModule({ providers: [provideLocaless(validOptions)] });
    TestBed.inject(ApplicationRef);

    expect(document.getElementById('localess-js-sync')).toBeNull();
  });

  it('waits for application stability before loading the sync script', async () => {
    // The sync script hooks every [data-ll-id] the moment the editor pongs, so loading it
    // during bootstrap raced the first render and left late-created elements unhooked.
    let stable: (() => void) | undefined;
    const whenStable = vi.fn(() => new Promise<void>(resolve => (stable = resolve)));
    TestBed.configureTestingModule({
      providers: [provideLocaless({ ...validOptions, enableSync: true }), { provide: ApplicationRef, useValue: { whenStable } }],
    });

    // Injecting the token must not be what triggers the load, and the load must not have
    // happened yet either — the app is still unstable.
    const syncReady = TestBed.inject(LOCALESS_SYNC_READY);
    await Promise.resolve();
    expect(whenStable).toHaveBeenCalled();
    expect(document.getElementById('localess-js-sync')).toBeNull();

    stable!();
    await syncReady;

    // Not framed in the test environment, so loadLocalessSync no-ops rather than injecting —
    // what matters is that it was not reached until stability, and that it resolves.
    await expect(syncReady).resolves.toBeUndefined();
  });
});

describe('provideLocaless — IMAGE_LOADER', () => {
  const validOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };
  const assetSrc = 'https://cms.example.com/api/v1/spaces/space-1/assets/asset-1';

  function loader(options = validOptions): ImageLoaderFn {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideLocaless(options)] });
    return TestBed.inject(IMAGE_LOADER);
  }

  it('leaves a non-asset URL untouched', () => {
    expect(loader()({ src: 'https://cdn.example.com/logo.svg', width: 200 })).toBe('https://cdn.example.com/logo.svg');
  });

  it('leaves an asset URL from a different space untouched', () => {
    const other = 'https://cms.example.com/api/v1/spaces/space-2/assets/asset-1';

    expect(loader()({ src: other, width: 200 })).toBe(other);
  });

  it('appends the width Angular supplies for a srcset entry', () => {
    expect(loader()({ src: assetSrc, width: 640 })).toBe(`${assetSrc}?w=640`);
  });

  it('returns the bare URL when there is nothing to append', () => {
    // Angular builds the `src` attribute with no width and no loaderParams.
    expect(loader()({ src: assetSrc })).toBe(assetSrc);
  });

  it('honours loaderParams on the width-less src call', () => {
    // The regression this guards: `src` used to fall through to the raw original whenever
    // width was absent, which for `getRewrittenSrc()` is *always*.
    expect(loader()({ src: assetSrc, loaderParams: { w: 1200, q: 70 } })).toBe(`${assetSrc}?w=1200&q=70`);
  });

  it('reaches every transform parameter through loaderParams', () => {
    const url = loader()({ src: assetSrc, loaderParams: { h: 300, q: 70, f: 'avif', fit: 'inside', thumbnail: true } });

    expect(url).toBe(`${assetSrc}?h=300&q=70&f=avif&fit=inside&thumbnail`);
  });

  it('supports an explicit format as a no-convert resize request', () => {
    expect(loader()({ src: assetSrc, loaderParams: { w: 400, f: 'jpeg' } })).toBe(`${assetSrc}?w=400&f=jpeg`);
  });

  it("lets Angular's per-entry width win over a w in loaderParams", () => {
    // srcset entries exist to vary the width; a fixed loaderParams `w` must not flatten them.
    expect(loader()({ src: assetSrc, width: 640, loaderParams: { w: 1200, q: 70 } })).toBe(`${assetSrc}?w=640&q=70`);
  });

  it('discards the height Angular derives from the aspect ratio', () => {
    // Sending both w and h would switch the API from width-only scaling to a fit crop.
    expect(loader()({ src: assetSrc, width: 640, height: 480 })).toBe(`${assetSrc}?w=640`);
  });

  it('still honours an explicit h from loaderParams alongside the derived width', () => {
    expect(loader()({ src: assetSrc, width: 640, height: 480, loaderParams: { h: 200, fit: 'inside' } })).toBe(
      `${assetSrc}?w=640&h=200&fit=inside`
    );
  });

  it('does not mutate the caller loaderParams object', () => {
    const loaderParams = { q: 70 };
    loader()({ src: assetSrc, width: 640, loaderParams });

    expect(loaderParams).toEqual({ q: 70 });
  });
});
