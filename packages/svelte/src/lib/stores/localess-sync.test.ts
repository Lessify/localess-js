import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

import * as state from '../core/state';
import { localessSync } from './localess-sync';

describe('localessSync store', () => {
  it('subscribes via localessSyncOn and starts undefined', () => {
    const spy = vi.spyOn(state, 'localessSyncOn');
    const store = localessSync('input');
    expect(get(store)).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('input', expect.any(Function));
  });
});
