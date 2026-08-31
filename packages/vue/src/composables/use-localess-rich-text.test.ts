import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h, ref } from 'vue';

import { useLocalessRichText, useLocalessRichTextHtml } from './use-localess-rich-text';

const docOf = (text: string): any => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

describe('useLocalessRichTextHtml', () => {
  it('returns HTML and reacts to doc changes', () => {
    const doc = ref<any>(docOf('One'));
    const html = useLocalessRichTextHtml(doc);
    expect(html.value).toBe('<p>One</p>');
    doc.value = docOf('Two');
    expect(html.value).toBe('<p>Two</p>');
  });
  it('returns empty string for undefined', () => {
    expect(useLocalessRichTextHtml(() => undefined).value).toBe('');
  });
});

describe('useLocalessRichText', () => {
  it('returns VNodes that render the content', () => {
    const nodes = useLocalessRichText(() => docOf('Hi'));
    const wrapper = mount({ render: () => h('div', null, [nodes.value]) });
    expect((wrapper.element as HTMLElement).innerHTML).toBe('<p>Hi</p>');
  });
});
