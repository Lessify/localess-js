import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SchemaComponent } from '../components/schema.component';
import { LOCALESS_COMPONENTS, LOCALESS_FALLBACK_COMPONENT } from '../localess.components';
import { LocalessComponentResolver } from './component-resolver.service';

@Component({ selector: 'll-test-hero', template: '' })
class HeroComponent extends SchemaComponent {}

@Component({ selector: 'll-test-teaser', template: '' })
class TeaserComponent extends SchemaComponent {}

@Component({ selector: 'll-test-fallback', template: '' })
class FallbackComponent extends SchemaComponent {}

describe('LocalessComponentResolver', () => {
  function createResolver(components?: Record<string, unknown>, fallback?: unknown): LocalessComponentResolver {
    TestBed.configureTestingModule({
      providers: [
        LocalessComponentResolver,
        ...(components ? [{ provide: LOCALESS_COMPONENTS, useValue: components }] : []),
        ...(fallback ? [{ provide: LOCALESS_FALLBACK_COMPONENT, useValue: fallback }] : []),
      ],
    });
    return TestBed.inject(LocalessComponentResolver);
  }

  it('resolves an eagerly-registered component by schema key', async () => {
    const resolver = createResolver({ hero: HeroComponent });

    const result = await resolver.resolve('hero');

    expect(result).toBe(HeroComponent);
  });

  it('resolves a lazy-loaded component by awaiting its loader', async () => {
    let callCount = 0;
    const loader = () => {
      callCount++;
      return Promise.resolve(TeaserComponent);
    };
    const resolver = createResolver({ teaser: loader });

    const result = await resolver.resolve('teaser');

    expect(result).toBe(TeaserComponent);
    expect(callCount).toBe(1);
  });

  it('caches a resolved lazy component so the loader only runs once', async () => {
    let callCount = 0;
    const loader = () => {
      callCount++;
      return Promise.resolve(TeaserComponent);
    };
    const resolver = createResolver({ teaser: loader });

    await resolver.resolve('teaser');
    await resolver.resolve('teaser');

    expect(callCount).toBe(1);
  });

  it('returns the fallback component when the schema key has no match', async () => {
    const resolver = createResolver({ hero: HeroComponent }, FallbackComponent);

    const result = await resolver.resolve('unknown-schema');

    expect(result).toBe(FallbackComponent);
  });

  it('returns null when the schema key has no match and no fallback is registered', async () => {
    const resolver = createResolver({ hero: HeroComponent });

    const result = await resolver.resolve('unknown-schema');

    expect(result).toBeNull();
  });

  it('reports whether a schema key is registered via has()', () => {
    const resolver = createResolver({ hero: HeroComponent });

    expect(resolver.has('hero')).toBe(true);
    expect(resolver.has('unknown-schema')).toBe(false);
  });
});
