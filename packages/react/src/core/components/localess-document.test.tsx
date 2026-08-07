import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { registerComponent, unregisterComponent } from '../state';
import { LocalessDocument } from './localess-document';

vi.mock('../state', async importOriginal => {
  const actual = await importOriginal<typeof import('../state')>();
  return { ...actual, localessSyncOn: vi.fn() };
});

import { localessSyncOn } from '../state';

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessDocument', () => {
  afterEach(() => {
    cleanup();
    unregisterComponent('page');
    (localessSyncOn as Mock).mockClear();
  });

  it('renders the registered component using document.data', () => {
    registerComponent('page', Page);

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('re-renders with updated content when the sync subscription fires an input/change event', () => {
    registerComponent('page', Page);

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);
    expect(screen.getByText('Hello')).toBeDefined();

    const [, syncCallback] = (localessSyncOn as Mock).mock.calls[0];
    act(() => {
      syncCallback({ data: { _schema: 'page', title: 'Updated' } });
    });

    expect(screen.getByText('Updated')).toBeDefined();
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page' } as any} />);

    expect(screen.getByText(/document\.data/)).toBeDefined();
  });
});
