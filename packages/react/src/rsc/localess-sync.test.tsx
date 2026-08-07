import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@localess/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@localess/client')>();
  return { ...actual, loadLocalessSync: vi.fn(() => Promise.resolve()) };
});

import { loadLocalessSync } from '@localess/client';

import { LocalessSync } from './localess-sync';

describe('LocalessSync', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not load the sync script when enableSync is false', () => {
    render(<LocalessSync document={{ data: {} } as any} origin="https://cms.example.com" enableSync={false} />);

    expect(loadLocalessSync).not.toHaveBeenCalled();
  });

  it('does not load the sync script when not running inside an iframe, even if enableSync is true', () => {
    // happy-dom's default window is not embedded in an iframe (window.top === window.self),
    // matching the same environment limitation documented in core/state.test.ts.
    render(<LocalessSync document={{ data: {} } as any} origin="https://cms.example.com" enableSync={true} />);

    expect(loadLocalessSync).not.toHaveBeenCalled();
  });
});
