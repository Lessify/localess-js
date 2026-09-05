import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichTextParseError } from '../parse-common';
import { renderRichTextToHtml } from '../render-html';
import { parseHtmlToRichText } from './index';

const parse = (html: string, options?: Parameters<typeof parseHtmlToRichText>[1]) => parseHtmlToRichText(html, options);
const content = (html: string) => parse(html).doc.content ?? [];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('never-throws contract', () => {
  it.each([
    ['empty string', ''],
    ['whitespace only', '   \n  '],
    ['text with no tags', 'bare text'],
  ])('%s does not throw', (_label, html) => {
    expect(() => parse(html)).not.toThrow();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('%s yields an empty doc', (_label, input) => {
    const result = parseHtmlToRichText(input as unknown as string);

    expect(result.doc).toEqual({ type: 'doc', content: [] });
    expect(result.unsupported).toEqual([]);
  });

  it.each([
    ['unclosed tag', '<p>open'],
    ['stray close tag', 'text</p>'],
    ['stray less-than', 'a < b'],
    ['mismatched nesting', '<p><strong>x</p></strong>'],
    ['unterminated comment', '<p>a</p><!-- never closed'],
    ['bare angle bracket in text', '<p>5 < 6 and 7 > 6</p>'],
  ])('malformed input: %s does not throw', (_label, html) => {
    expect(() => parse(html)).not.toThrow();
  });
});

describe('block nodes', () => {
  it('parses a paragraph', () => {
    expect(content('<p>Hello</p>')).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]);
  });

  it.each([1, 2, 3, 4, 5, 6])('parses an h%i', level => {
    expect(content(`<h${level}>T</h${level}>`)).toEqual([{ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'T' }] }]);
  });

  it('parses a bullet list', () => {
    expect(content('<ul><li><p>a</p></li></ul>')).toEqual([
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] }] },
    ]);
  });

  it('parses an ordered list without start', () => {
    const [list] = content('<ol><li><p>a</p></li></ol>') as any[];

    expect(list.type).toBe('orderedList');
    expect(list.attrs).toBeUndefined();
  });

  it('parses an ordered list with start', () => {
    const [list] = content('<ol start="5"><li><p>a</p></li></ol>') as any[];

    expect(list.attrs).toEqual({ start: 5 });
  });

  it('omits start when it is 1, matching the renderer', () => {
    const [list] = content('<ol start="1"><li><p>a</p></li></ol>') as any[];

    expect(list.attrs).toBeUndefined();
  });

  it('wraps bare list item text in a paragraph', () => {
    expect(content('<ul><li>a</li></ul>')).toEqual([
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] }] },
    ]);
  });

  it('parses a code block without a language', () => {
    expect(content('<pre><code>x = 1</code></pre>')).toEqual([{ type: 'codeBlock', content: [{ type: 'text', text: 'x = 1' }] }]);
  });

  it('parses a code block with a language', () => {
    expect(content('<pre><code class="language-ts">const x = 1;</code></pre>')).toEqual([
      { type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'const x = 1;' }] },
    ]);
  });

  it('preserves whitespace inside a code block', () => {
    const [block] = content('<pre><code>line 1\n  indented</code></pre>') as any[];

    expect(block.content[0].text).toBe('line 1\n  indented');
  });

  it('wraps loose top-level text in a paragraph', () => {
    expect(content('bare text')).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'bare text' }] }]);
  });

  it('treats div and span as transparent', () => {
    expect(content('<div><p>a</p></div>')).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }]);
  });

  it('drops whitespace between block tags', () => {
    expect(content('<p>a</p>\n  <p>b</p>')).toHaveLength(2);
  });
});

describe('marks', () => {
  const mark = (html: string) => (content(html)[0] as any).content[0].marks;

  it.each([
    ['strong', 'bold'],
    ['b', 'bold'],
    ['em', 'italic'],
    ['i', 'italic'],
    ['s', 'strike'],
    ['strike', 'strike'],
    ['del', 'strike'],
    ['u', 'underline'],
    ['code', 'code'],
  ])('<%s> becomes the %s mark', (tag, type) => {
    expect(mark(`<p><${tag}>x</${tag}></p>`)).toEqual([{ type }]);
  });

  it('parses a link with all attributes', () => {
    expect(mark('<p><a href="https://example.com" target="_blank" rel="noopener" class="c">x</a></p>')).toEqual([
      { type: 'link', attrs: { href: 'https://example.com', target: '_blank', rel: 'noopener', class: 'c' } },
    ]);
  });

  it('nulls absent link attributes', () => {
    expect(mark('<p><a href="/x">x</a></p>')).toEqual([{ type: 'link', attrs: { href: '/x', target: null, rel: null, class: null } }]);
  });

  it('keeps nested marks in source order', () => {
    expect(mark('<p><strong><em>x</em></strong></p>')).toEqual([{ type: 'bold' }, { type: 'italic' }]);
  });

  it('round-trips a deeply nested mark combination', () => {
    const html = '<p><strong><em><u>x</u></em></strong></p>';

    expect(renderRichTextToHtml(parse(html).doc)).toBe(html);
  });

  it('does not turn a code block wrapper into a code mark', () => {
    const [block] = content('<pre><code>x</code></pre>') as any[];

    expect(block.content[0].marks).toBeUndefined();
  });
});

describe('href sanitization', () => {
  const href = (url: string) => (content(`<p><a href="${url}">x</a></p>`)[0] as any).content[0].marks[0].attrs.href;

  it.each([
    ['javascript:alert(1)', ''],
    ['JavaScript:alert(1)', ''],
    ['data:text/html;base64,PHA+', ''],
    ['vbscript:x', ''],
  ])('%s is emptied', (input, expected) => {
    expect(href(input)).toBe(expected);
  });

  it.each([
    ['https://example.com', 'https://example.com'],
    ['http://example.com', 'http://example.com'],
    ['mailto:a@b.com', 'mailto:a@b.com'],
    ['tel:+123', 'tel:+123'],
    ['/relative/path', '/relative/path'],
    ['#anchor', '#anchor'],
    ['?query=1', '?query=1'],
  ])('%s survives', (input, expected) => {
    expect(href(input)).toBe(expected);
  });
});

describe('unsupported policy', () => {
  const table = '<table><tr><td>cell</td></tr></table>';

  it('unwraps by default, keeping the text', () => {
    const { doc, unsupported } = parse(table);

    expect(renderRichTextToHtml(doc)).toContain('cell');
    expect(unsupported.map(u => u.element)).toContain('table');
    expect(unsupported.every(u => u.action === 'unwrapped')).toBe(true);
  });

  it('skips the element and its content with skip', () => {
    const { doc, unsupported } = parse(table, { unsupported: 'skip' });

    expect(renderRichTextToHtml(doc)).not.toContain('cell');
    expect(unsupported[0]).toEqual({ element: 'table', action: 'skipped', count: 1 });
  });

  it('throws with throw, naming the element', () => {
    expect(() => parse(table, { unsupported: 'throw' })).toThrow(RichTextParseError);
    expect(() => parse(table, { unsupported: 'throw' })).toThrow(/table/);
  });

  it('exposes the element on the error', () => {
    try {
      parse(table, { unsupported: 'throw' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as RichTextParseError).element).toBe('table');
    }
  });

  it('counts repeated occurrences accurately', () => {
    const { unsupported } = parse('<blockquote>a</blockquote><blockquote>b</blockquote><blockquote>c</blockquote>');

    expect(unsupported).toEqual([{ element: 'blockquote', action: 'unwrapped', count: 3 }]);
  });

  it('reports each element type separately', () => {
    const { unsupported } = parse('<blockquote>a</blockquote><table><td>b</td></table>');

    expect(unsupported.map(u => u.element).sort()).toEqual(['blockquote', 'table', 'td']);
  });

  it('is empty for fully representable input', () => {
    expect(parse('<p>a</p><h2>b</h2><ul><li><p>c</p></li></ul>').unsupported).toEqual([]);
  });

  it('always drops script and style content regardless of policy', () => {
    const { doc } = parse('<p>a</p><script>evil()</script><style>.x{}</style>');

    expect(renderRichTextToHtml(doc)).toBe('<p>a</p>');
  });
});

describe('warnings', () => {
  it('warns once per unsupported element type per parse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    parse('<blockquote>a</blockquote><blockquote>b</blockquote>');

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns separately for different element types', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    parse('<blockquote>a</blockquote><table>b</table>');

    expect(warn.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('resets between parses', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    parse('<blockquote>a</blockquote>');
    parse('<blockquote>b</blockquote>');

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('is silent in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      parse('<blockquote>a</blockquote>');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe('entities', () => {
  it('decodes named and numeric references', () => {
    const [paragraph] = content('<p>&amp; &lt; &gt; &#65; &#x42;</p>') as any[];

    expect(paragraph.content[0].text).toBe('& < > A B');
  });

  it('leaves unknown references verbatim rather than dropping text', () => {
    const [paragraph] = content('<p>&notareal;</p>') as any[];

    expect(paragraph.content[0].text).toBe('&notareal;');
  });

  it('decodes entities inside attribute values', () => {
    const marks = (content('<p><a href="/a?x=1&amp;y=2">x</a></p>')[0] as any).content[0].marks;

    expect(marks[0].attrs.href).toBe('/a?x=1&y=2');
  });
});
