import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerComponent, unregisterComponent } from '../core/client';
import { LocalessServerDocument } from './localess-document';

function Page({ data }: any) {
  return <p>{data.title}</p>;
}

describe('LocalessServerDocument', () => {
  afterEach(() => {
    cleanup();
    unregisterComponent('page');
  });

  it('renders the registered component using document.data', () => {
    registerComponent('page', Page);

    render(<LocalessServerDocument document={{ _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any} />);

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessServerDocument document={{ _id: 'c1', _schema: 'page' } as any} />);

    expect(screen.getByText(/document\.data/)).toBeDefined();
  });
});
