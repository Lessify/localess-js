import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichTextParseError } from '../parse-common';
import { renderRichTextToHtml } from '../render-html';
import { parseMarkdownToRichText } from './index';

const parse = (markdown: string, options?: Parameters<typeof parseMarkdownToRichText>[1]) => parseMarkdownToRichText(markdown, options);
const html = (markdown: string) => renderRichTextToHtml(parse(markdown).doc);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('never-throws contract', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   \n\n  '],
  ])('%s yields an empty doc', (_label, input) => {
    const result = parseMarkdownToRichText(input as unknown as string);

    expect(result.doc).toEqual({ type: 'doc', content: [] });
    expect(result.unsupported).toEqual([]);
  });

  it.each([
    ['unclosed fence', '```ts\nconst x = 1;'],
    ['unclosed emphasis', 'a **bold'],
    ['unclosed link', '[label](https://x.com'],
    ['stray brackets', 'a ] b ( c'],
    ['lone underline', '---'],
  ])('malformed input: %s does not throw', (_label, markdown) => {
    expect(() => parse(markdown)).not.toThrow();
  });
});

describe('headings', () => {
  it.each([1, 2, 3, 4, 5, 6])('parses an ATX h%i', level => {
    expect(html(`${'#'.repeat(level)} Title`)).toBe(`<h${level}>Title</h${level}>`);
  });

  it('ignores trailing hashes', () => {
    expect(html('## Title ##')).toBe('<h2>Title</h2>');
  });

  it('parses a setext h1', () => {
    expect(html('Title\n=====')).toBe('<h1>Title</h1>');
  });

  it('parses a setext h2', () => {
    expect(html('Title\n-----')).toBe('<h2>Title</h2>');
  });

  it('requires a space after the hashes', () => {
    expect(html('#NotAHeading')).toBe('<p>#NotAHeading</p>');
  });
});

describe('paragraphs', () => {
  it('parses a paragraph', () => {
    expect(html('Hello world')).toBe('<p>Hello world</p>');
  });

  it('joins soft-wrapped lines', () => {
    expect(html('one\ntwo')).toBe('<p>one two</p>');
  });

  it('separates paragraphs on a blank line', () => {
    expect(html('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
  });
});

describe('lists', () => {
  it.each(['-', '*', '+'])('parses a bullet list with %s', marker => {
    expect(html(`${marker} a\n${marker} b`)).toBe('<ul><li><p>a</p></li><li><p>b</p></li></ul>');
  });

  it('parses an ordered list', () => {
    expect(html('1. a\n2. b')).toBe('<ol><li><p>a</p></li><li><p>b</p></li></ol>');
  });

  it('emits start when the list does not begin at 1', () => {
    expect(html('3. a\n4. b')).toBe('<ol start="3"><li><p>a</p></li><li><p>b</p></li></ol>');
  });

  it('omits start when the list begins at 1, matching the renderer', () => {
    expect(html('1. a')).toBe('<ol><li><p>a</p></li></ol>');
  });

  it('parses a nested list', () => {
    expect(html('- a\n  - b')).toBe('<ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul>');
  });

  it('keeps inline marks inside items', () => {
    expect(html('- **bold** item')).toBe('<ul><li><p><strong>bold</strong> item</p></li></ul>');
  });
});

describe('code blocks', () => {
  it('parses a fenced block without a language', () => {
    expect(html('```\nx = 1\n```')).toBe('<pre><code>x = 1</code></pre>');
  });

  it('parses a fenced block with a language', () => {
    expect(html('```ts\nconst x = 1;\n```')).toBe('<pre><code class="language-ts">const x = 1;</code></pre>');
  });

  it('parses a tilde fence', () => {
    expect(html('~~~\nx\n~~~')).toBe('<pre><code>x</code></pre>');
  });

  it('parses an indented code block', () => {
    expect(html('    x = 1')).toBe('<pre><code>x = 1</code></pre>');
  });

  it('does not interpret markdown inside a code block', () => {
    expect(html('```\n**not bold**\n```')).toBe('<pre><code>**not bold**</code></pre>');
  });

  it('preserves internal blank lines and indentation', () => {
    expect(html('```\na\n\n  b\n```')).toBe('<pre><code>a\n\n  b</code></pre>');
  });
});

describe('inline marks', () => {
  it.each([
    ['**bold**', '<p><strong>bold</strong></p>'],
    ['__bold__', '<p><strong>bold</strong></p>'],
    ['*italic*', '<p><em>italic</em></p>'],
    ['_italic_', '<p><em>italic</em></p>'],
    ['~~strike~~', '<p><s>strike</s></p>'],
    ['`code`', '<p><code>code</code></p>'],
  ])('parses %s', (markdown, expected) => {
    expect(html(markdown)).toBe(expected);
  });

  it('parses nested emphasis', () => {
    expect(html('**bold *and italic***')).toBe('<p><strong>bold <em>and italic</em></strong></p>');
  });

  it('treats code span contents as literal', () => {
    expect(html('`**not bold**`')).toBe('<p><code>**not bold**</code></p>');
  });

  it('honours backslash escapes', () => {
    expect(html('\\*not italic\\*')).toBe('<p>*not italic*</p>');
  });

  it('leaves an unmatched delimiter as text', () => {
    expect(html('a * b')).toBe('<p>a * b</p>');
  });

  it('parses a link', () => {
    expect(html('[label](https://example.com)')).toBe('<p><a href="https://example.com">label</a></p>');
  });

  it('drops a link title, which the model cannot hold', () => {
    expect(html('[label](https://example.com "Title")')).toBe('<p><a href="https://example.com">label</a></p>');
  });

  it('parses marks inside a link label', () => {
    expect(html('[**bold**](/x)')).toBe('<p><a href="/x"><strong>bold</strong></a></p>');
  });

  it('keeps an image as literal text rather than dropping it', () => {
    expect(html('![alt](/img.png)')).toContain('alt');
  });
});

describe('href sanitization', () => {
  const href = (url: string) => (parse(`[x](${url})`).doc.content![0] as any).content[0].marks[0].attrs.href;

  it.each([
    ['javascript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['<java\tscript:alert(1)>', ''],
  ])('%s is emptied', (input, expected) => {
    expect(href(input)).toBe(expected);
  });

  it.each([
    ['https://example.com', 'https://example.com'],
    ['mailto:a@b.com', 'mailto:a@b.com'],
    ['tel:+123', 'tel:+123'],
    ['/relative', '/relative'],
  ])('%s survives', (input, expected) => {
    expect(href(input)).toBe(expected);
  });

  it('strips angle brackets around a destination', () => {
    expect(href('</a b>')).toBe('/a b');
  });
});

describe('blockquotes', () => {
  it('parses a blockquote', () => {
    expect(html('> quoted')).toBe('<blockquote><p>quoted</p></blockquote>');
  });

  it('joins consecutive quoted lines into one paragraph', () => {
    expect(html('> one\n> two')).toBe('<blockquote><p>one two</p></blockquote>');
  });

  it('keeps blocks inside a blockquote', () => {
    expect(html('> # T\n>\n> - a')).toBe('<blockquote><h1>T</h1><ul><li><p>a</p></li></ul></blockquote>');
  });

  it('continues a quoted paragraph lazily', () => {
    expect(html('> one\ntwo')).toBe('<blockquote><p>one two</p></blockquote>');
  });

  it('ends at a blank line', () => {
    expect(html('> one\n\ntwo')).toBe('<blockquote><p>one</p></blockquote><p>two</p>');
  });

  it('nests', () => {
    expect(html('> > deep')).toBe('<blockquote><blockquote><p>deep</p></blockquote></blockquote>');
  });
});

describe('thematic breaks', () => {
  it.each(['---', '***', '___', '- - -', '* * *'])('parses %s', marker => {
    expect(html(`a\n\n${marker}\n\nb`)).toBe('<p>a</p><hr><p>b</p>');
  });

  it('interrupts a paragraph', () => {
    expect(html('a\n***')).toBe('<p>a</p><hr>');
  });

  it('still reads --- under a paragraph as a setext heading', () => {
    expect(html('a\n---')).toBe('<h2>a</h2>');
  });

  it('ends a list', () => {
    expect(html('- a\n* * *')).toBe('<ul><li><p>a</p></li></ul><hr>');
  });
});

describe('unsupported policy', () => {
  const table = '| a | b |\n|---|---|\n| c | d |';

  it('unwraps a table by default, keeping each row as a paragraph', () => {
    const { doc, unsupported } = parse(table);

    expect(renderRichTextToHtml(doc)).toBe('<p>a b</p><p>c d</p>');
    expect(unsupported).toEqual([{ element: 'table', action: 'unwrapped', count: 1 }]);
  });

  it('skips a table with skip', () => {
    const { doc, unsupported } = parse(table, { unsupported: 'skip' });

    expect(renderRichTextToHtml(doc)).toBe('');
    expect(unsupported).toEqual([{ element: 'table', action: 'skipped', count: 1 }]);
  });

  it('throws with throw', () => {
    expect(() => parse(table, { unsupported: 'throw' })).toThrow(RichTextParseError);
  });

  it('does not treat a lone pipe row as a table', () => {
    expect(parse('| not a table |').unsupported).toEqual([]);
  });

  it('counts repeated occurrences', () => {
    expect(parse(`${table}\n\n${table}`).unsupported[0].count).toBe(2);
  });

  it('is empty for fully representable input', () => {
    expect(parse('# T\n\ntext\n\n- a\n\n> q\n\n---\n\n```\nx\n```').unsupported).toEqual([]);
  });
});

describe('warnings', () => {
  const table = '| a | b |\n|---|---|\n| c | d |';

  it('warns once per unsupported construct per parse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    parse(`${table}\n\n${table}`);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is silent in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      parse(table);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe('renders back through the renderer', () => {
  it('handles a full document', () => {
    const markdown = [
      '# Title',
      '',
      'Some **bold** and *italic* text with a [link](/x).',
      '',
      '- one',
      '- two',
      '',
      '```ts',
      'const x = 1;',
      '```',
    ].join('\n');

    expect(html(markdown)).toBe(
      '<h1>Title</h1>' +
        '<p>Some <strong>bold</strong> and <em>italic</em> text with a <a href="/x">link</a>.</p>' +
        '<ul><li><p>one</p></li><li><p>two</p></li></ul>' +
        '<pre><code class="language-ts">const x = 1;</code></pre>'
    );
  });
});
