import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_BROWSER_CONFIG, LOCALESS_SYNC_READY, LocalessBrowserConfig } from '../localess.config';
import { LocalessSyncService } from './sync.service';

describe('LocalessSyncService', () => {
  const baseConfig: LocalessBrowserConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    assetPathPrefix: 'https://cms.example.com/api/v1/spaces/space-1/assets/',
  };

  function createService(config: LocalessBrowserConfig, syncReady: Promise<void> = Promise.resolve()): LocalessSyncService {
    TestBed.configureTestingModule({
      providers: [
        LocalessSyncService,
        { provide: LOCALESS_BROWSER_CONFIG, useValue: config },
        { provide: LOCALESS_SYNC_READY, useValue: syncReady },
      ],
    });
    return TestBed.inject(LocalessSyncService);
  }

  it('reports disabled when enableSync is not set', () => {
    const service = createService(baseConfig);
    expect(service.enabled()).toBe(false);
  });

  it('reflects enableSync combined with the iframe/browser context', () => {
    // Simulate the Visual Editor iframe context (window.self !== window.top),
    // independent of whether the test runner itself embeds an iframe.
    const originalTop = window.top;
    Object.defineProperty(window, 'top', { value: {}, configurable: true });
    try {
      const service = createService({ ...baseConfig, enableSync: true });
      expect(service.enabled()).toBe(true);
    } finally {
      Object.defineProperty(window, 'top', { value: originalTop, configurable: true });
    }
  });

  it('resolves ready() with the injected promise', async () => {
    let resolved = false;
    const readyPromise = Promise.resolve().then(() => {
      resolved = true;
    });
    const service = createService(baseConfig, readyPromise);

    await service.ready();
    expect(resolved).toBe(true);
  });

  it('does not subscribe via on() when sync is disabled', () => {
    const service = createService(baseConfig);
    const callback = vi.fn();

    service.on('change', callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not subscribe via onChange() when sync is disabled', () => {
    const service = createService(baseConfig);
    const callback = vi.fn();

    service.onChange(callback);

    expect(callback).not.toHaveBeenCalled();
  });
});
