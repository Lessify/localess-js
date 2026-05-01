import { describe, expect, it } from 'vitest';

import { dotToNestedObject, nestedObjectToFlat, sortObjectKeys } from './utils';

describe('sortObjectKeys', () => {
  it('should sort top-level keys alphabetically', () => {
    const input = { b: '2', a: '1', c: '3' };
    const result = sortObjectKeys(input);
    expect(Object.keys(result)).toEqual(['a', 'b', 'c']);
    expect(result).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('should recursively sort nested object keys', () => {
    const input = { z: { b: '2', a: '1' }, a: { y: 'y', x: 'x' } };
    const result = sortObjectKeys(input);
    expect(Object.keys(result)).toEqual(['a', 'z']);
    expect(Object.keys(result['a'] as object)).toEqual(['x', 'y']);
    expect(Object.keys(result['z'] as object)).toEqual(['a', 'b']);
  });

  it('should not sort array values', () => {
    const input = { b: ['z', 'a'], a: 'value' } as unknown as Record<string, unknown>;
    const result = sortObjectKeys(input);
    expect(Object.keys(result)).toEqual(['a', 'b']);
    expect(result['b']).toEqual(['z', 'a']);
  });

  it('should handle an empty object', () => {
    expect(sortObjectKeys({})).toEqual({});
  });

  it('should handle already sorted keys', () => {
    const input = { a: '1', b: '2', c: '3' };
    const result = sortObjectKeys(input);
    expect(Object.keys(result)).toEqual(['a', 'b', 'c']);
  });

  it('should preserve null values without recursing into them', () => {
    const input = { b: null, a: 'value' } as unknown as Record<string, unknown>;
    const result = sortObjectKeys(input);
    expect(Object.keys(result)).toEqual(['a', 'b']);
    expect(result['b']).toBeNull();
  });

  it('should sort keys at 3 levels deep', () => {
    const input = {
      z: { d: { beta: '1', alpha: '2' }, c: 'c' },
      a: { f: 'f', e: { two: '2', one: '1' } },
    };
    const result = sortObjectKeys(input);
    expect(Object.keys(result)).toEqual(['a', 'z']);
    expect(Object.keys(result['a'] as object)).toEqual(['e', 'f']);
    expect(Object.keys((result['a'] as Record<string, unknown>)['e'] as object)).toEqual(['one', 'two']);
    expect(Object.keys(result['z'] as object)).toEqual(['c', 'd']);
    expect(Object.keys((result['z'] as Record<string, unknown>)['d'] as object)).toEqual(['alpha', 'beta']);
  });

  it('should sort keys at 4 levels deep', () => {
    const input = {
      root: {
        z: { d: { beta: 'b', alpha: 'a' }, c: 'c' },
        a: { f: 'f', e: 'e' },
      },
    };
    const result = sortObjectKeys(input);
    const root = result['root'] as Record<string, unknown>;
    expect(Object.keys(root)).toEqual(['a', 'z']);
    const z = root['z'] as Record<string, unknown>;
    expect(Object.keys(z)).toEqual(['c', 'd']);
    expect(Object.keys(z['d'] as object)).toEqual(['alpha', 'beta']);
  });
});

describe('dotToNestedObject', () => {
  it('should convert a flat dot-notation object to nested', () => {
    const input = { 'a.b': '1', 'a.c': '2' };
    expect(dotToNestedObject(input)).toEqual({ a: { b: '1', c: '2' } });
  });

  it('should handle keys without dots as top-level properties', () => {
    const input = { hello: 'world', foo: 'bar' };
    expect(dotToNestedObject(input)).toEqual({ hello: 'world', foo: 'bar' });
  });

  it('should handle deeply nested keys', () => {
    const input = { 'a.b.c.d': 'deep' };
    expect(dotToNestedObject(input)).toEqual({ a: { b: { c: { d: 'deep' } } } });
  });

  it('should merge keys sharing the same prefix', () => {
    const input = { 'nav.home': 'Home', 'nav.about': 'About', 'nav.contact': 'Contact' };
    expect(dotToNestedObject(input)).toEqual({ nav: { home: 'Home', about: 'About', contact: 'Contact' } });
  });

  it('should handle an empty object', () => {
    expect(dotToNestedObject({})).toEqual({});
  });

  it('should handle mixed flat and nested keys', () => {
    const input = { 'a.b': '1', c: '2' };
    expect(dotToNestedObject(input)).toEqual({ a: { b: '1' }, c: '2' });
  });
});

describe('sortObjectKeys + dotToNestedObject combined', () => {
  it('should produce a sorted nested object', () => {
    const flat = { 'b.y': '1', 'b.x': '2', 'a.z': '3', 'a.w': '4' };
    const result = sortObjectKeys(dotToNestedObject(flat));
    expect(Object.keys(result)).toEqual(['a', 'b']);
    expect(Object.keys(result['a'] as object)).toEqual(['w', 'z']);
    expect(Object.keys(result['b'] as object)).toEqual(['x', 'y']);
  });

  it('should produce a sorted flat object', () => {
    const flat = { z: 'last', a: 'first', m: 'middle' };
    const result = sortObjectKeys(flat);
    expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
  });
});

describe('nestedObjectToFlat', () => {
  it('should convert a nested object to flat dot-notation', () => {
    const input = { a: { b: '1', c: '2' } };
    expect(nestedObjectToFlat(input)).toEqual({ 'a.b': '1', 'a.c': '2' });
  });

  it('should keep top-level string values as-is', () => {
    const input = { hello: 'world', foo: 'bar' };
    expect(nestedObjectToFlat(input)).toEqual({ hello: 'world', foo: 'bar' });
  });

  it('should handle deeply nested objects', () => {
    const input = { a: { b: { c: { d: 'deep' } } } };
    expect(nestedObjectToFlat(input)).toEqual({ 'a.b.c.d': 'deep' });
  });

  it('should handle mixed flat and nested keys', () => {
    const input = { a: { b: '1' }, c: '2' };
    expect(nestedObjectToFlat(input)).toEqual({ 'a.b': '1', c: '2' });
  });

  it('should handle an empty object', () => {
    expect(nestedObjectToFlat({})).toEqual({});
  });

  it('should handle multiple branches at the same level', () => {
    const input = { nav: { home: 'Home', about: 'About', contact: 'Contact' } };
    expect(nestedObjectToFlat(input)).toEqual({
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.contact': 'Contact',
    });
  });

  it('should handle 4 levels deep', () => {
    const input = { root: { z: { d: { beta: 'b', alpha: 'a' } }, a: { f: 'f' } } };
    expect(nestedObjectToFlat(input)).toEqual({
      'root.z.d.beta': 'b',
      'root.z.d.alpha': 'a',
      'root.a.f': 'f',
    });
  });
});

describe('nestedObjectToFlat + dotToNestedObject roundtrip', () => {
  it('should roundtrip flat → nested → flat', () => {
    const flat = { 'a.b': '1', 'a.c': '2', 'nav.home': 'Home', 'nav.about': 'About' };
    expect(nestedObjectToFlat(dotToNestedObject(flat))).toEqual(flat);
  });

  it('should roundtrip nested → flat → nested', () => {
    const nested = { a: { b: '1', c: '2' }, nav: { home: 'Home', about: 'About' } };
    expect(dotToNestedObject(nestedObjectToFlat(nested))).toEqual(nested);
  });
});
