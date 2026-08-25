import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localessInit } from '../core/client';
import { LocalessServerDocument } from './localess-document';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessServerDocument', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the registered component using document.data', () => {
    localessInit({ ...baseOptions, components: { page: Page } });

    render(<LocalessServerDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessServerDocument document={{ _id: 'c1', _schema: 'page' } as any} />);

    expect(screen.getByText(/document\.data/)).toBeDefined();
  });
});
