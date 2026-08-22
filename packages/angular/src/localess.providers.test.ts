import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LOCALESS_COMPONENTS, withLocalessComponents } from './localess.components';
import { provideLocaless } from './localess.providers';

@Component({ selector: 'll-test-hero', template: '' })
class HeroComponent {}

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
});
