import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

import * as state from '../client';
import { localessSync } from './localess-sync';

describe('localessSync store', () => {
  it('subscribes via localessSyncOn and starts undefined', () => {
    const spy = vi.spyOn(state, 'localessSyncOn');
    const store = localessSync('input');
    expect(get(store)).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('input', expect.any(Function));
  });

  it('holds one sync subscription while read, and releases it after the last reader leaves', () => {
    let active = 0;
    vi.spyOn(state, 'localessSyncOn').mockImplementation(() => {
      active++;
      return () => active--;
    });
    const store = localessSync('save');

    const stopA = store.subscribe(() => {});
    const stopB = store.subscribe(() => {});
    expect(active).toBe(1);
    stopA();
    stopB();
    expect(active).toBe(0);

    store.subscribe(() => {})();
    expect(active).toBe(0);
  });
});
