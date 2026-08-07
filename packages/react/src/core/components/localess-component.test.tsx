import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerComponent, setFallbackComponent, unregisterComponent } from '../state';
import { LocalessComponent } from './localess-component';

function Hero({ data, ...rest }: any) {
  return <h1 {...rest}>{data.title}</h1>;
}

describe('LocalessComponent', () => {
  afterEach(() => {
    cleanup();
    unregisterComponent('hero');
    setFallbackComponent(undefined as any);
  });

  it('renders the registered component for a matching schema key', () => {
    registerComponent('hero', Hero);

    render(<LocalessComponent data={{ _schema: 'hero', title: 'Welcome' } as any} />);

    expect(screen.getByText('Welcome')).toBeDefined();
  });

  it('spreads localessEditable data-ll-* attributes onto the rendered component', () => {
    registerComponent('hero', Hero);

    const { container } = render(<LocalessComponent data={{ _schema: 'hero', _id: 'block-1', title: 'Welcome' } as any} />);

    expect(container.querySelector('[data-ll-id="block-1"]')).not.toBeNull();
    expect(container.querySelector('[data-ll-schema="hero"]')).not.toBeNull();
  });

  it('renders the fallback component when no registry match is found', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Fallback({ data }: any) {
      return <div>Unknown: {data._schema}</div>;
    }
    setFallbackComponent(Fallback);

    render(<LocalessComponent data={{ _schema: 'missing-schema' } as any} />);

    expect(screen.getByText('Unknown: missing-schema')).toBeDefined();
  });

  it('renders an inline error when neither a matching component nor a fallback is registered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessComponent data={{ _schema: 'missing-schema' } as any} />);

    expect(screen.getByText(/could not found component/)).toBeDefined();
  });

  it('renders an inline error when data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LocalessComponent data={undefined as any} />);

    expect(screen.getByText(/property/i)).toBeDefined();
  });
});
