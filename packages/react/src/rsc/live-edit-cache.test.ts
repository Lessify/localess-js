import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearLiveEdit, consumeLiveEdit, setLiveEdit } from './live-edit-cache';

describe('live-edit-cache', () => {
  afterEach(() => {
    clearLiveEdit('doc-1');
    clearLiveEdit('doc-2');
  });

  it('returns undefined for a key that was never set', () => {
    expect(consumeLiveEdit('doc-1')).toBeUndefined();
  });

  it('setLiveEdit followed by consumeLiveEdit returns the stored value', () => {
    setLiveEdit('doc-1', { title: 'Updated' });

    expect(consumeLiveEdit('doc-1')).toEqual({ title: 'Updated' });
  });

  it('consumeLiveEdit deletes the entry after reading it (one-shot)', () => {
    setLiveEdit('doc-1', { title: 'Updated' });

    expect(consumeLiveEdit('doc-1')).toEqual({ title: 'Updated' });
    expect(consumeLiveEdit('doc-1')).toBeUndefined();
  });

  it('clearLiveEdit removes an entry without needing to read it', () => {
    setLiveEdit('doc-1', { title: 'Updated' });
    clearLiveEdit('doc-1');

    expect(consumeLiveEdit('doc-1')).toBeUndefined();
  });

  it('distinct ids do not collide', () => {
    setLiveEdit('doc-1', { title: 'One' });
    setLiveEdit('doc-2', { title: 'Two' });

    expect(consumeLiveEdit('doc-1')).toEqual({ title: 'One' });
    expect(consumeLiveEdit('doc-2')).toEqual({ title: 'Two' });
  });

  it('stores the cache on globalThis so it survives module re-evaluation', async () => {
    setLiveEdit('doc-1', { title: 'Persisted' });

    // Re-import the module fresh (simulates a dev-server module reload) and confirm
    // the entry is still there — this only works if state lives on globalThis, not
    // in a module-scope variable that would be reset by a fresh module instance.
    vi.resetModules();
    const fresh = await import('./live-edit-cache');

    expect(fresh.consumeLiveEdit('doc-1')).toEqual({ title: 'Persisted' });
  });
});
