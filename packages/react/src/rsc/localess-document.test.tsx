import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../core/client')>();
  return { ...actual, getOrigin: () => 'https://cms.example.com', isSyncConfigured: () => false };
});

import { registerComponent, unregisterComponent } from '../core/client';
import { clearLiveEdit, setLiveEdit } from './live-edit-cache';
import { LocalessDocument } from './localess-document';

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessDocument (rsc, Server-Action-driven)', () => {
  afterEach(() => {
    unregisterComponent('page');
    clearLiveEdit('doc-1');
  });

  it('renders using document.data when no live edit is cached', () => {
    registerComponent('page', Page);

    render(<LocalessDocument document={{ id: 'doc-1', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders using the cached live edit, overlaid over document.data, when one exists for this id', () => {
    registerComponent('page', Page);
    setLiveEdit('doc-1', { _schema: 'page', title: 'Live Edited' });

    render(<LocalessDocument document={{ id: 'doc-1', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Live Edited')).toBeDefined();
  });

  it('consumes the cached live edit (one-shot) so a second render falls back to document.data', () => {
    registerComponent('page', Page);
    setLiveEdit('doc-1', { _schema: 'page', title: 'Live Edited' });

    render(<LocalessDocument document={{ id: 'doc-1', data: { _schema: 'page', title: 'Hello' } } as any} />);
    render(<LocalessDocument document={{ id: 'doc-1', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getAllByText('Hello').length).toBeGreaterThan(0);
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessDocument document={{ id: 'doc-1' } as any} />);

    expect(screen.getByText(/document\.data/)).toBeDefined();
  });
});
