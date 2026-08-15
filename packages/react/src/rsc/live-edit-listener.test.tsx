import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@localess/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@localess/client')>();
  return { ...actual, loadLocalessSync: vi.fn(() => Promise.resolve()), isBrowser: () => true, isIframe: () => true };
});

const localessLiveEditActionMock = vi.fn();
vi.mock('./live-edit-action', () => ({ localessLiveEditAction: localessLiveEditActionMock }));

import { LiveEditListener } from './live-edit-listener';

type LocalessEventListener = (event: { type: string; data?: unknown }) => void;

function mockWindowLocaless() {
  const listeners: LocalessEventListener[] = [];
  (window as any).localess = {
    on: (_types: string[], cb: LocalessEventListener) => {
      listeners.push(cb);
    },
  };
  return {
    emit: (event: { type: string; data?: unknown }) => listeners.forEach(cb => cb(event)),
  };
}

describe('LiveEditListener', () => {
  afterEach(() => {
    delete (window as any).localess;
    localessLiveEditActionMock.mockClear();
    vi.restoreAllMocks();
  });

  it('renders nothing', () => {
    const { container } = render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={true} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls localessLiveEditAction with id, current pathname, event type, and data on a change event', async () => {
    const bridge = mockWindowLocaless();
    render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={true} />);

    await vi.waitFor(() => expect((window as any).localess).toBeDefined());
    bridge.emit({ type: 'change', data: { title: 'Updated' } });

    await vi.waitFor(() =>
      expect(localessLiveEditActionMock).toHaveBeenCalledWith({
        id: 'doc-1',
        path: window.location.pathname,
        type: 'change',
        data: { title: 'Updated' },
      })
    );
  });

  it('does not subscribe when enableSync is false', async () => {
    mockWindowLocaless();
    render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={false} />);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localessLiveEditActionMock).not.toHaveBeenCalled();
  });

  it('logs via console.error and does not throw when the action call rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localessLiveEditActionMock.mockRejectedValueOnce(new Error('boom'));
    const bridge = mockWindowLocaless();
    render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={true} />);

    await vi.waitFor(() => expect((window as any).localess).toBeDefined());
    bridge.emit({ type: 'change', data: { title: 'Updated' } });

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });
});
