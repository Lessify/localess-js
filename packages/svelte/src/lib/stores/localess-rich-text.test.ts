import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';

import { localessRichText } from './localess-rich-text';

describe('localessRichText store', () => {
  it('renders a Tiptap JSON doc to HTML', () => {
    const store = localessRichText({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });
    expect(get(store)).toContain('hello');
  });

  it('returns an empty string for undefined', () => {
    const store = localessRichText(undefined);
    expect(get(store)).toBe('');
  });
});
