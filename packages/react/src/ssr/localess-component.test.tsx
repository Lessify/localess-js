import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localessInit } from '../core/client';
import { LocalessServerComponent } from './localess-component';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

function Hero({ data, ...rest }: any) {
  return <h1 {...rest}>{data.title}</h1>;
}

describe('LocalessServerComponent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the registered component for a matching schema key', () => {
    localessInit({ ...baseOptions, components: { hero: Hero } });

    render(<LocalessServerComponent data={{ _schema: 'hero', title: 'Welcome' } as any} />);

    expect(screen.getByText('Welcome')).toBeDefined();
  });

  it('does not inject data-ll-* editable attributes (server-safe, no live editing)', () => {
    localessInit({ ...baseOptions, components: { hero: Hero } });

    const { container } = render(<LocalessServerComponent data={{ _schema: 'hero', _id: 'block-1', title: 'Welcome' } as any} />);

    expect(container.querySelector('[data-ll-id]')).toBeNull();
    expect(container.querySelector('[data-ll-schema]')).toBeNull();
  });

  it('renders the fallback component when no registry match is found', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Fallback({ data }: any) {
      return <div>Unknown: {data._schema}</div>;
    }
    localessInit({ ...baseOptions, fallbackComponent: Fallback });

    render(<LocalessServerComponent data={{ _schema: 'missing-schema' } as any} />);

    expect(screen.getByText('Unknown: missing-schema')).toBeDefined();
  });

  it('renders an inline error when data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localessInit(baseOptions);

    render(<LocalessServerComponent data={undefined as any} />);

    expect(screen.getByText(/property/i)).toBeDefined();
  });
});
