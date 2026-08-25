import { act, cleanup, render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localessInit } from '../client';
import { LocalessDocument } from './localess-document';

vi.mock('../client', async importOriginal => {
  const actual = await importOriginal<typeof import('../client')>();
  return { ...actual, localessSyncOnChange: vi.fn() };
});

import { localessSyncOnChange } from '../client';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessDocument', () => {
  afterEach(() => {
    cleanup();
    (localessSyncOnChange as Mock).mockClear();
  });

  it('renders the registered component using document.data', () => {
    localessInit({ ...baseOptions, components: { page: Page } });

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('re-renders with updated content when the sync subscription fires an input/change event', () => {
    localessInit({ ...baseOptions, components: { page: Page } });

    render(<LocalessDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);
    expect(screen.getByText('Hello')).toBeDefined();

    const [syncCallback] = (localessSyncOnChange as Mock).mock.calls[0];
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
