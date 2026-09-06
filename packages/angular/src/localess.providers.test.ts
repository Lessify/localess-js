import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { SchemaComponent } from './components/schema.component';
import { LOCALESS_COMPONENTS, withLocalessComponents } from './localess.components';
import { LOCALESS_SYNC_READY } from './localess.config';
import { provideLocaless } from './localess.providers';

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
