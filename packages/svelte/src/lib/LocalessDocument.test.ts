import { cleanup, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TitleProbe from './__fixtures__/title-probe.svelte';
import * as state from './core/state';
import { setComponentsForTest } from './core/state';
import LocalessDocument from './LocalessDocument.svelte';

describe('LocalessDocument', () => {
  afterEach(() => {
    cleanup();
    setComponentsForTest({});
    vi.restoreAllMocks();
  });

  it('renders the registered component using document.data', () => {
    setComponentsForTest({ page: TitleProbe as any });

    render(LocalessDocument, { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any });

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('re-renders with updated content when the sync subscription fires an input/change event', async () => {
    setComponentsForTest({ page: TitleProbe as any });
    const spy = vi.spyOn(state, 'localessSyncOnChange');

    render(LocalessDocument, { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any });
    expect(screen.getByText('Hello')).toBeInTheDocument();

    const [callback] = spy.mock.calls[0];
    callback({ type: 'change', data: { _schema: 'page', title: 'Updated' } } as any);
    await tick();

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(LocalessDocument, { document: { _id: 'c1', _schema: 'page' } as any });

    expect(screen.getByText(/document\.data/)).toBeInTheDocument();
  });
});
