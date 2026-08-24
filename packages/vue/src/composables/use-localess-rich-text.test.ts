import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { useLocalessRichText } from './use-localess-rich-text';

describe('useLocalessRichText', () => {
  it('renders a Tiptap JSON doc to HTML', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    };
    const Comp = defineComponent({
      setup() {
        const html = useLocalessRichText(() => doc);
        return () => h('div', { innerHTML: html.value });
      },
    });
    const wrapper = mount(Comp);
    expect(wrapper.html()).toContain('hello');
  });

  it('returns an empty string when doc is undefined', () => {
    const Comp = defineComponent({
      setup() {
        const html = useLocalessRichText(() => undefined);
        return () => h('div', html.value);
      },
    });
    const wrapper = mount(Comp);
    expect(wrapper.text()).toBe('');
  });
});
