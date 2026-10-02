import { act, cleanup, render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localessInit } from '../client';
import { LocalessDocument } from './localess-document';

vi.mock('../client', async importOriginal => {
  const actual = await importOriginal<typeof import('../client')>();
  return { ...actual, localessSyncOnDocument: vi.fn() };
});

import { localessSyncOnDocument } from '../client';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessDocument', () => {
  afterEach(() => {
    cleanup();
    (localessSyncOnDocument as Mock).mockClear();
  });

  it('renders the registered component using document.data', () => {
    localessInit({ ...baseOptions, components: { page: Page } });

    render(<LocalessDocument document={{ id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('re-renders with the edits of its own document', () => {
    localessInit({ ...baseOptions, components: { page: Page } });

    render(<LocalessDocument document={{ id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);
    expect(screen.getByText('Hello')).toBeDefined();

    // Subscribed to its own document only; filtering by id is covered by the sync controller's tests.
    const [documentId, syncCallback] = (localessSyncOnDocument as Mock).mock.calls[0];
    expect(documentId).toBe('c1');
    act(() => {
      syncCallback({ _schema: 'page', title: 'Updated' });
    });

    expect(screen.getByText('Updated')).toBeDefined();
  });

  it('removes its sync subscription on unmount', () => {
    localessInit({ ...baseOptions, components: { page: Page } });
    const unsubscribe = vi.fn();
    (localessSyncOnDocument as Mock).mockReturnValueOnce(unsubscribe);

    const { unmount } = render(
      <LocalessDocument document={{ id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />
    );
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessDocument document={{ id: 'c1', _schema: 'page' } as any} />);

    expect(screen.getByText(/document\.data/)).toBeDefined();
  });
});
