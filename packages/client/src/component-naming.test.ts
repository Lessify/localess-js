import { describe, expect, it } from 'vitest';

import {
  type ComponentNamingStrategy,
  createComponentIndex,
  DEFAULT_COMPONENT_NAMING,
  formatComponentKeyCollisions,
  normalizeComponentKey,
  splitComponentWords,
} from './component-naming';

describe('splitComponentWords', () => {
  it.each([
    ['HeroBanner', ['Hero', 'Banner']],
    ['heroBanner', ['hero', 'Banner']],
    ['hero-banner', ['hero', 'banner']],
    ['hero_banner', ['hero', 'banner']],
    ['hero banner', ['hero', 'banner']],
    ['hero.banner', ['hero', 'banner']],
    ['Page', ['Page']],
    ['page', ['page']],
  ])('splits %s', (input, expected) => {
    expect(splitComponentWords(input)).toEqual(expected);
  });

  it('treats a run of capitals as an acronym', () => {
    expect(splitComponentWords('HTMLBlock')).toEqual(['HTML', 'Block']);
    expect(splitComponentWords('parseHTMLBlock')).toEqual(['parse', 'HTML', 'Block']);
  });

  it('collapses repeated separators', () => {
    expect(splitComponentWords('hero__banner--block')).toEqual(['hero', 'banner', 'block']);
  });
});

describe('normalizeComponentKey', () => {
  it('defaults to exact', () => {
    expect(DEFAULT_COMPONENT_NAMING).toBe('exact');
    expect(normalizeComponentKey('HeroBanner')).toBe('HeroBanner');
  });

  it('leaves everything untouched under exact', () => {
    for (const name of ['HeroBanner', 'hero-banner', 'hero_banner', 'page']) {
      expect(normalizeComponentKey(name, 'exact')).toBe(name);
    }
  });

  const spellings = ['HeroBanner', 'heroBanner', 'hero-banner', 'hero_banner'];
  const expected: Record<Exclude<ComponentNamingStrategy, 'exact'>, string> = {
    camelCase: 'heroBanner',
    PascalCase: 'HeroBanner',
    'kebab-case': 'hero-banner',
    snake_case: 'hero_banner',
    lowercase: 'herobanner',
  };

  for (const [strategy, want] of Object.entries(expected)) {
    it(`maps every spelling to ${want} under ${strategy}`, () => {
      for (const spelling of spellings) {
        expect(normalizeComponentKey(spelling, strategy as ComponentNamingStrategy)).toBe(want);
      }
    });
  }

  it('is idempotent', () => {
    for (const strategy of ['camelCase', 'PascalCase', 'kebab-case', 'snake_case', 'lowercase'] as ComponentNamingStrategy[]) {
      const once = normalizeComponentKey('HeroBanner', strategy);
      expect(normalizeComponentKey(once, strategy)).toBe(once);
    }
  });

  it('accepts a custom function', () => {
    expect(normalizeComponentKey('HeroBanner', name => `ll-${name.toLowerCase()}`)).toBe('ll-herobanner');
  });

  it('returns the input unchanged when it has no words', () => {
    expect(normalizeComponentKey('', 'camelCase')).toBe('');
    expect(normalizeComponentKey('---', 'camelCase')).toBe('---');
  });

  it('handles single-word names', () => {
    expect(normalizeComponentKey('Page', 'camelCase')).toBe('page');
    expect(normalizeComponentKey('page', 'PascalCase')).toBe('Page');
    expect(normalizeComponentKey('Page', 'kebab-case')).toBe('page');
  });
});

describe('createComponentIndex', () => {
  it('indexes by normalized key', () => {
    const { index } = createComponentIndex({ HeroBanner: 'C' }, 'kebab-case');

    expect(index.get('hero-banner')).toBe('C');
  });

  it('matches a differently-spelled schema through the same strategy', () => {
    const { index } = createComponentIndex({ HeroBanner: 'C' }, 'camelCase');

    expect(index.get(normalizeComponentKey('hero_banner', 'camelCase'))).toBe('C');
  });

  it('does not match a differently-spelled schema under exact', () => {
    const { index } = createComponentIndex({ HeroBanner: 'C' }, 'exact');

    expect(index.get(normalizeComponentKey('hero_banner', 'exact'))).toBeUndefined();
    expect(index.get('HeroBanner')).toBe('C');
  });

  it('reports no collisions under exact', () => {
    const { collisions } = createComponentIndex({ HeroBanner: 'A', 'hero-banner': 'B' }, 'exact');

    expect(collisions).toEqual([]);
  });

  it('reports a collision and keeps the first registration', () => {
    const { index, collisions } = createComponentIndex({ HeroBanner: 'A', 'hero-banner': 'B' }, 'camelCase');

    expect(index.get('heroBanner')).toBe('A');
    expect(collisions).toEqual([{ normalized: 'heroBanner', keys: ['HeroBanner', 'hero-banner'] }]);
  });

  it('reports each colliding group once', () => {
    const { collisions } = createComponentIndex({ A_b: '1', aB: '2', Ab: '3', other: '4' }, 'lowercase');

    expect(collisions).toHaveLength(1);
    expect(collisions[0].keys).toEqual(['A_b', 'aB', 'Ab']);
  });

  it('handles an empty registry', () => {
    const { index, collisions } = createComponentIndex({}, 'camelCase');

    expect(index.size).toBe(0);
    expect(collisions).toEqual([]);
  });
});

describe('formatComponentKeyCollisions', () => {
  it('names the offending keys and the strategy', () => {
    const message = formatComponentKeyCollisions([{ normalized: 'heroBanner', keys: ['HeroBanner', 'hero-banner'] }], 'camelCase');

    expect(message).toContain('HeroBanner, hero-banner -> "heroBanner"');
    expect(message).toContain('"camelCase"');
    expect(message).toContain('"exact"');
  });

  it('describes a custom function without printing it', () => {
    const message = formatComponentKeyCollisions([{ normalized: 'x', keys: ['A', 'B'] }], () => 'x');

    expect(message).toContain('a custom naming function');
  });
});
