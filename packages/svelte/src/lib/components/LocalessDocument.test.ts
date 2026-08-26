import { cleanup, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TitleProbe from '../__fixtures__/title-probe.svelte';
import * as state from '../client';
import { localessInit } from '../client';
import LocalessDocument from './LocalessDocument.svelte';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

describe('LocalessDocument', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the registered component using document.data', () => {
    localessInit({ ...baseOptions, components: { page: TitleProbe as any } });

    render(LocalessDocument, { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any });

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('re-renders with updated content when the sync subscription fires an input/change event', async () => {
    localessInit({ ...baseOptions, components: { page: TitleProbe as any } });
    const spy = vi.spyOn(state, 'localessSyncOnChange');

    render(LocalessDocument, { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any });
    expect(screen.getByText('Hello')).toBeInTheDocument();

    const [callback] = spy.mock.calls[0];
    callback({ type: 'change', data: { _schema: 'page', title: 'Updated' } } as any);
    await tick();

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('re-renders with the new content when the document prop changes (e.g. client-side navigation to a new slug)', async () => {
    localessInit({ ...baseOptions, components: { page: TitleProbe as any } });

    const { rerender } = render(LocalessDocument, {
      document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Home' } } as any,
    });
    expect(screen.getByText('Home')).toBeInTheDocument();

    await rerender({ document: { _id: 'c2', _schema: 'page', data: { _schema: 'page', title: 'About' } } as any });

    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(LocalessDocument, { document: { _id: 'c1', _schema: 'page' } as any });

    expect(screen.getByText(/document\.data/)).toBeInTheDocument();
  });
});
