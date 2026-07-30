import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { renderRichTextToReact } from './richtext';

describe('renderRichTextToReact', () => {
  it('renders a paragraph with bold text to HTML', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'world' },
          ],
        },
      ],
    } as any;

    const node = renderRichTextToReact(content);
    const html = renderToStaticMarkup(node as any);

    expect(html).toContain('Hello');
    expect(html).toContain('<strong>world</strong>');
  });

  it('renders headings and lists', () => {
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] }],
        },
      ],
    } as any;

    const html = renderToStaticMarkup(renderRichTextToReact(content) as any);

    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('Item 1');
  });
});
