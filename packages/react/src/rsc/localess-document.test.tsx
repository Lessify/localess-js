import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerComponent, unregisterComponent } from '../core/state';

vi.mock('../core/state', async importOriginal => {
  const actual = await importOriginal<typeof import('../core/state')>();
  return { ...actual, getOrigin: () => 'https://cms.example.com', isSyncConfigured: () => false };
});
vi.mock('./localess-sync', () => ({ LocalessSync: () => null }));

import { LocalessDocument } from './localess-document';

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessDocument (rsc)', () => {
  afterEach(() => {
    cleanup();
    unregisterComponent('page');
  });

  it('renders the registered component using document.data with no client boundary involved', () => {
    registerComponent('page', Page);

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page' } as any} />);

    expect(screen.getByText(/document\.data/)).toBeDefined();
  });
});
