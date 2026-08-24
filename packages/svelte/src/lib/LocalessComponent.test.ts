import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Hero from './__fixtures__/hero.svelte';
import PropsProbe from './__fixtures__/props-probe.svelte';
import { setComponentsForTest, setFallbackComponentForTest } from './core/state';
import LocalessComponent from './LocalessComponent.svelte';

describe('LocalessComponent', () => {
  it('renders the registered component and applies editable attrs', () => {
    setComponentsForTest({ hero: Hero as any });
    render(LocalessComponent, { data: { _id: 'abc', _schema: 'hero' } });
    const el = screen.getByTestId('hero');
    expect(el).toHaveAttribute('data-ll-id', 'abc');
    expect(el).toHaveAttribute('data-ll-schema', 'hero');
  });

  it('renders a not-found message when unregistered and no fallback', () => {
    setComponentsForTest({});
    render(LocalessComponent, { data: { _id: 'abc', _schema: 'missing' } });
    expect(screen.getByText(/could not find/)).toBeInTheDocument();
  });

  it('forwards assets, links, and references to the registered component', () => {
    setComponentsForTest({ probe: PropsProbe as any });
    render(LocalessComponent, {
      data: { _id: 'abc', _schema: 'probe' },
      assets: { a1: { uri: 'x' } as any },
      links: { l1: { name: 'Home' } as any },
      references: { r1: { _id: 'r1', _schema: 'page', data: { _schema: 'page' } } as any },
    });
    expect(screen.getByTestId('assets-keys')).toHaveTextContent('a1');
    expect(screen.getByTestId('links-keys')).toHaveTextContent('l1');
    expect(screen.getByTestId('references-keys')).toHaveTextContent('r1');
  });

  it('forwards assets, links, and references to the fallback component', () => {
    setComponentsForTest({});
    setFallbackComponentForTest(PropsProbe as any);
    render(LocalessComponent, {
      data: { _id: 'abc', _schema: 'missing' },
      assets: { a1: { uri: 'x' } as any },
      links: { l1: { name: 'Home' } as any },
      references: { r1: { _id: 'r1', _schema: 'page', data: { _schema: 'page' } } as any },
    });
    expect(screen.getByTestId('assets-keys')).toHaveTextContent('a1');
    expect(screen.getByTestId('links-keys')).toHaveTextContent('l1');
    expect(screen.getByTestId('references-keys')).toHaveTextContent('r1');
  });
});
