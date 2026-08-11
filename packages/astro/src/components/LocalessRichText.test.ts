import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import LocalessRichText from './LocalessRichText.astro';

describe('LocalessRichText', () => {
  it('renders rich text content as HTML', async () => {
    const container = await AstroContainer.create();
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    } as any;

    const html = await container.renderToString(LocalessRichText, { props: { content } });

    expect(html).toContain('Hello world');
    expect(html).toContain('<p>');
  });
});
