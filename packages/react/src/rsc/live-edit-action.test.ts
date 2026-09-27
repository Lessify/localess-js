import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearLiveEdit, consumeLiveEdit, markLiveEditable, setLiveEdit } from './live-edit-cache';

const revalidatePathMock = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

const isSyncConfiguredMock = vi.fn(() => true);
vi.mock('../core/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../core/client')>();
  return { ...actual, isSyncConfigured: () => isSyncConfiguredMock() };
});

describe('localessLiveEditAction', () => {
  const originalNextRuntime = process.env.NEXT_RUNTIME;

  beforeEach(() => {
    process.env.NEXT_RUNTIME = 'nodejs';
    revalidatePathMock.mockClear();
    isSyncConfiguredMock.mockReturnValue(true);
    markLiveEditable('doc-1');
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

  describe('rejects calls it cannot trust', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('when enableSync is not set server-side', async () => {
      isSyncConfiguredMock.mockReturnValue(false);
      const { localessLiveEditAction } = await import('./live-edit-action');

      await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'input', data: { title: 'Injected' } });

      expect(consumeLiveEdit('doc-1')).toBeUndefined();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it('when the id was never rendered by this server', async () => {
      const { localessLiveEditAction } = await import('./live-edit-action');

      await localessLiveEditAction({ id: 'unknown-doc', path: '/home', type: 'input', data: { title: 'Injected' } });

      expect(consumeLiveEdit('unknown-doc')).toBeUndefined();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it.each(['home', '//evil.example.com', '/\\evil', `/${'a'.repeat(2048)}`])('when the path is %s', async path => {
      const { localessLiveEditAction } = await import('./live-edit-action');

      await localessLiveEditAction({ id: 'doc-1', path, type: 'input', data: { title: 'Injected' } });

      expect(consumeLiveEdit('doc-1')).toBeUndefined();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it('when the type is unknown', async () => {
      const { localessLiveEditAction } = await import('./live-edit-action');

      await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'bogus' as never, data: { title: 'Injected' } });

      expect(consumeLiveEdit('doc-1')).toBeUndefined();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it.each([undefined, null, 'text', ['a']])('when input data is %s', async data => {
      const { localessLiveEditAction } = await import('./live-edit-action');

      await localessLiveEditAction({ id: 'doc-1', path: '/home', type: 'input', data });

      expect(consumeLiveEdit('doc-1')).toBeUndefined();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });
  });
});
