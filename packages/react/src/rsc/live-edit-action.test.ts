import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearLiveEdit, consumeLiveEdit } from './live-edit-cache';

const revalidatePathMock = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

describe('localessLiveEditAction', () => {
  const originalNextRuntime = process.env.NEXT_RUNTIME;

  beforeEach(() => {
    process.env.NEXT_RUNTIME = 'nodejs';
    revalidatePathMock.mockClear();
  });

  afterEach(() => {
    process.env.NEXT_RUNTIME = originalNextRuntime;
    clearLiveEdit('doc-1');
  });

  it('caches the data and revalidates on an input event', async () => {
    const { localessLiveEditAction } = await import('./live-edit-action');

    await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'input', data: { title: 'Updated' } });

    expect(consumeLiveEdit('doc-1')).toEqual({ title: 'Updated' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/home');
  });

  it('caches the data and revalidates on a change event', async () => {
    const { localessLiveEditAction } = await import('./live-edit-action');

    await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'change', data: { title: 'Updated' } });

    expect(consumeLiveEdit('doc-1')).toEqual({ title: 'Updated' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/home');
  });

  it('clears the cache entry and still revalidates on a save event', async () => {
    const { localessLiveEditAction } = await import('./live-edit-action');
    const { setLiveEdit } = await import('./live-edit-cache');
    setLiveEdit('doc-1', { title: 'Stale' });

    await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'save' });

    expect(consumeLiveEdit('doc-1')).toBeUndefined();
    expect(revalidatePathMock).toHaveBeenCalledWith('/home');
  });

  it('does not call revalidatePath when NEXT_RUNTIME is unset', async () => {
    delete process.env.NEXT_RUNTIME;
    const { localessLiveEditAction } = await import('./live-edit-action');

    await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'input', data: { title: 'Updated' } });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('logs and returns without caching or revalidating when id or path is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { localessLiveEditAction } = await import('./live-edit-action');

    await localessLiveEditAction({ id: '', path: '/home', type: 'input', data: { title: 'x' } });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
