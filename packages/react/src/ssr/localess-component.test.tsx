import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerComponent, setFallbackComponent, unregisterComponent } from '../core/client';
import { LocalessServerComponent } from './localess-component';

function Hero({ data, ...rest }: any) {
  return <h1 {...rest}>{data.title}</h1>;
}

describe('LocalessServerComponent', () => {
  afterEach(() => {
    cleanup();
    unregisterComponent('hero');
    setFallbackComponent(undefined as any);
  });

  it('renders the registered component for a matching schema key', () => {
    registerComponent('hero', Hero);

    render(<LocalessServerComponent data={{ _schema: 'hero', title: 'Welcome' } as any} />);

    expect(screen.getByText('Welcome')).toBeDefined();
  });

  it('does not inject data-ll-* editable attributes (server-safe, no live editing)', () => {
    registerComponent('hero', Hero);

    const { container } = render(<LocalessServerComponent data={{ _schema: 'hero', _id: 'block-1', title: 'Welcome' } as any} />);

    expect(container.querySelector('[data-ll-id]')).toBeNull();
    expect(container.querySelector('[data-ll-schema]')).toBeNull();
  });

  it('renders the fallback component when no registry match is found', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Fallback({ data }: any) {
      return <div>Unknown: {data._schema}</div>;
    }
    setFallbackComponent(Fallback);

    render(<LocalessServerComponent data={{ _schema: 'missing-schema' } as any} />);

    expect(screen.getByText('Unknown: missing-schema')).toBeDefined();
  });

  it('renders an inline error when data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessServerComponent data={undefined as any} />);

    expect(screen.getByText(/property/i)).toBeDefined();
  });
});
