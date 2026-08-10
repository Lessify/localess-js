import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import LocalessSync from './LocalessSync.astro';

describe('LocalessSync', () => {
  it('renders a script tag and passes the origin through define:vars', async () => {
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessSync, {
      props: { origin: 'https://cms.example.com' },
    });

    expect(html).toContain('<script');
    expect(html).toContain('https://cms.example.com');
  });

  it('renders no visible content', async () => {
    const container = await AstroContainer.create();

    const html = await container.renderToString(LocalessSync, {
      props: { origin: 'https://cms.example.com' },
    });

    const withoutScript = html.replace(/<script[\s\S]*?<\/script>/, '').trim();
    expect(withoutScript).toBe('');
  });
});
