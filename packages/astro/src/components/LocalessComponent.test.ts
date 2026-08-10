import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerComponent, setComponents, setFallbackComponent } from '../state';

import FixtureFallback from './__fixtures__/FixtureFallback.astro';
import FixturePage from './__fixtures__/FixturePage.astro';
import LocalessComponent from './LocalessComponent.astro';

describe('LocalessComponent', () => {
  afterEach(() => {
    setComponents({});
    setFallbackComponent(undefined as never);
    vi.restoreAllMocks();
  });

  it('renders the registered component for data._schema and adds data-ll-id/data-ll-schema', async () => {
    registerComponent('page', FixturePage);
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessComponent, {
      props: { data: { _id: '1', _schema: 'page' } },
    });

    expect(html).toContain('data-ll-id="1"');
    expect(html).toContain('data-ll-schema="page"');
  });

  it('renders the fallback component when the schema has no registry match', async () => {
    setFallbackComponent(FixtureFallback);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessComponent, {
      props: { data: { _id: '2', _schema: 'unknown' } },
    });

    expect(html).toContain('Fallback');
  });

  it('renders an inline error when there is no match and no fallback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessComponent, {
      props: { data: { _id: '3', _schema: 'unknown' } },
    });

    expect(html).toContain('unknown');
  });
});
