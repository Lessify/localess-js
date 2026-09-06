import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const localessLiveEditActionMock = vi.fn();
vi.mock('./live-edit-action', () => ({ localessLiveEditAction: localessLiveEditActionMock }));

import { resetSyncForTest } from '@localess/live-preview';

import { LiveEditListener } from './live-edit-listener';

type LocalessEventListener = (event: { type: string; data?: unknown }) => void;

const SCRIPT_ID = 'localess-js-sync';

/**
 * Frames the page so the Visual Editor environment check passes. That check lives
 * in `@localess/live-preview` now, so faking it at the environment level is the
 * only thing that actually reaches it.
 */
function enterEditorFrame(): void {
  vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
}

/** Simulates the injected script finishing, which is what resolves the load promise. */
function completeScriptLoad(): void {
  document.getElementById(SCRIPT_ID)?.dispatchEvent(new Event('load'));
}

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
    resetSyncForTest();
    document.getElementById(SCRIPT_ID)?.remove();
  });

  it('renders nothing', () => {
    const { container } = render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={true} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls localessLiveEditAction with id, current pathname, event type, and data on a change event', async () => {
    enterEditorFrame();
    enterEditorFrame();
    const bridge = mockWindowLocaless();
    render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={true} />);
    completeScriptLoad();
    completeScriptLoad();

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
    enterEditorFrame();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localessLiveEditActionMock.mockRejectedValueOnce(new Error('boom'));
    const bridge = mockWindowLocaless();
    render(<LiveEditListener id="doc-1" origin="https://cms.example.com" enableSync={true} />);
    completeScriptLoad();

    await vi.waitFor(() => expect((window as any).localess).toBeDefined());
    bridge.emit({ type: 'change', data: { title: 'Updated' } });

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });
});
