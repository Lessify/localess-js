import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cache, NoCache, TTLCache } from './cache';

describe('Cache', () => {
  it('stores and retrieves values', () => {
    const cache = new Cache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
    expect(cache.has('key')).toBe(true);
  });

  it('returns undefined for missing keys', () => {
    const cache = new Cache<string>();
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });
});

describe('NoCache', () => {
  it('never stores anything', () => {
    const cache = new NoCache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBeUndefined();
    expect(cache.has('key')).toBe(false);
  });
});

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to a 5 minute TTL', () => {
    const cache = new TTLCache<string>();
    cache.set('key', 'value');

    vi.advanceTimersByTime(299_999);
    expect(cache.has('key')).toBe(true);

    vi.advanceTimersByTime(2);
    expect(cache.has('key')).toBe(false);
  });

  it('respects a custom TTL', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('key', 'value');

    vi.advanceTimersByTime(999);
    expect(cache.get('key')).toBe('value');

    vi.advanceTimersByTime(2);
    expect(cache.get('key')).toBeUndefined();
  });

  it('removes expired entries on access', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('key', 'value');
    vi.advanceTimersByTime(1001);

    expect(cache.get('key')).toBeUndefined();
    // Second access confirms the entry was deleted, not just skipped.
    expect(cache.has('key')).toBe(false);
  });

  it('returns undefined for keys that were never set', () => {
    const cache = new TTLCache<string>();
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });
});
