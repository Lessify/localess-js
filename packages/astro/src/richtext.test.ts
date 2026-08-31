import { richTextFixtures } from '@localess/richtext/test-utils';
import { describe, expect, it } from 'vitest';

import { renderLocalessRichTextToHtml } from './richtext';

describe('renderLocalessRichTextToHtml fixture parity', () => {
  for (const fixture of richTextFixtures) {
    it(fixture.title, () => {
      expect(renderLocalessRichTextToHtml(fixture.input as any)).toBe(fixture.expected);
    });
  }
});

describe('renderLocalessRichTextToHtml overrides', () => {
  it('applies custom renderers', () => {
    const input: any = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] };
    const html = renderLocalessRichTextToHtml(input, {
      renderers: { paragraph: ({ children }) => `<div class="rt-p">${children}</div>` },
    });
    expect(html).toBe('<div class="rt-p">Hi</div>');
  });
});
