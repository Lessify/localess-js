import { richTextFixtures } from '@localess/richtext/test-utils';
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import LocalessRichText from './LocalessRichText.svelte';

function domNormalize(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.innerHTML;
}

/** Svelte 5 renders `{@html}` blocks with `<!---->` anchor comments — framework artifacts, not content. */
function contentHtml(container: HTMLElement): string {
  return container.innerHTML.replace(/<!---->/g, '');
}

describe('LocalessRichText fixture parity', () => {
  for (const fixture of richTextFixtures) {
    it(fixture.title, () => {
      const { container } = render(LocalessRichText, { props: { content: fixture.input as any } });
      expect(contentHtml(container)).toBe(domNormalize(fixture.expected));
    });
  }
});

describe('LocalessRichText reactivity', () => {
  it('updates when content changes (fixes the one-shot store bug)', async () => {
    const docOf = (text: string): any => ({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    });
    const { container, rerender } = render(LocalessRichText, { props: { content: docOf('One') } });
    expect(contentHtml(container)).toBe('<p>One</p>');
    await rerender({ content: docOf('Two') });
    expect(contentHtml(container)).toBe('<p>Two</p>');
  });
});

describe('LocalessRichText overrides', () => {
  it('applies string-based custom renderers', () => {
    const input: any = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] };
    const { container } = render(LocalessRichText, {
      props: { content: input, renderers: { paragraph: ({ children }: any) => `<div class="rt-p">${children}</div>` } },
    });
    expect(contentHtml(container)).toBe('<div class="rt-p">Hi</div>');
  });
});
