import { richTextFixtures } from '@localess/richtext/test-utils';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import { LocalessRichText } from './components/localess-rich-text';
import { renderRichText } from './richtext';

function renderedHtml(input: any, renderers?: any): string {
  const nodes = renderRichText(input, { renderers });
  const wrapper = mount({ render: () => h('div', null, nodes == null ? [] : [nodes]) });
  return (wrapper.element as HTMLElement).innerHTML;
}

function domNormalize(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.innerHTML;
}

describe('renderRichText (vue) fixture parity', () => {
  for (const fixture of richTextFixtures) {
    it(fixture.title, () => {
      expect(renderedHtml(fixture.input)).toBe(domNormalize(fixture.expected));
    });
  }
});

describe('vue overrides', () => {
  it('renders a custom paragraph component with slot children', () => {
    // Render function, not `template:` — the default `vue` build in vitest has no runtime template compiler.
    // Override components must declare the props they receive (or set `inheritAttrs: false`),
    // otherwise Vue's attribute fallthrough sprays node fields onto the root element.
    const Custom = {
      props: ['type', 'content', 'context', '_key'],
      render() {
        return h('div', { class: 'rt-p' }, (this as any).$slots.default?.());
      },
    };
    const input = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] };
    expect(renderedHtml(input, { paragraph: Custom })).toBe('<div class="rt-p">Hi</div>');
  });
});

describe('LocalessRichText component', () => {
  it('renders content', () => {
    const input = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] };
    const wrapper = mount({ render: () => h('div', h(LocalessRichText, { content: input as any })) });
    expect((wrapper.element as HTMLElement).innerHTML).toBe('<p>Hi</p>');
  });
});
