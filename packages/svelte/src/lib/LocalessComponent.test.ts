import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';

import { setComponentsForTest } from './core/state';
import LocalessComponent from './LocalessComponent.svelte';
import Hero from './__fixtures__/hero.svelte';

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
});
