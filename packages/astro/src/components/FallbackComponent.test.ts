import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import FallbackComponent from './FallbackComponent.astro';

describe('FallbackComponent', () => {
  it('renders the missing schema key', async () => {
    const container = await AstroContainer.create();

    const html = await container.renderToString(FallbackComponent, {
      props: { data: { _id: '1', _schema: 'unknown-widget' } },
    });

    expect(html).toContain('unknown-widget');
  });
});
