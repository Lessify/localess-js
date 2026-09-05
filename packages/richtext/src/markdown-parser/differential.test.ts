import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';

import { renderRichTextToHtml } from '../render-html';
import { parseMarkdownToRichText } from './index';

/**
 * Differential test against `markdown-it`, on the supported subset only.
 *
 * The parser does not claim CommonMark compliance — the model has no tables,
 * images, or blockquotes — so this compares only constructs the model can
 * represent, and normalizes away formatting `markdown-it` emits that the model
 * deliberately drops (newlines between blocks, `<li>` without a wrapping `<p>`).
 *
 * `markdown-it` is a devDependency only; the package still has exactly one
 * production dependency.
 */
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

/** Removes differences that are formatting, not meaning. */
function normalize(html: string): string {
  return html
    .replace(/\n/g, '')
    .replace(/<li>(?!<p>)([\s\S]*?)<\/li>/g, '<li><p>$1</p></li>')
    .replace(/\s+</g, '<')
    .replace(/>\s+/g, '>')
    .trim();
}

describe('agrees with markdown-it on the supported subset', () => {
  const cases = [
    '# Heading one',
    '## Heading two',
    'A plain paragraph.',
    'Some **bold** text.',
    'Some *italic* text.',
    'Some `code` span.',
    'A [link](https://example.com) inline.',
    '- one\n- two',
    '1. one\n2. two',
    '```\nx = 1\n```',
    '```ts\nconst x = 1;\n```',
    'para one\n\npara two',
  ];

  for (const markdown of cases) {
    it(`matches for ${JSON.stringify(markdown.slice(0, 40))}`, () => {
      const ours = renderRichTextToHtml(parseMarkdownToRichText(markdown).doc);

      expect(normalize(ours)).toBe(normalize(md.render(markdown)));
    });
  }
});

describe('documented divergences', () => {
  it('drops a link title that markdown-it keeps', () => {
    const ours = renderRichTextToHtml(parseMarkdownToRichText('[x](/a "T")').doc);

    expect(ours).toBe('<p><a href="/a">x</a></p>');
    expect(md.render('[x](/a "T")')).toContain('title="T"');
  });

  it('renders strike, which markdown-it emits as <s> too', () => {
    const ours = renderRichTextToHtml(parseMarkdownToRichText('~~gone~~').doc);

    expect(normalize(ours)).toBe(normalize(md.render('~~gone~~')));
  });
});
