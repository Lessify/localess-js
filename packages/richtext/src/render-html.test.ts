import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRichTextToHtml } from './render-html';

const doc = (...content: any[]) => ({ type: 'doc', content });
const p = (...content: any[]) => ({ type: 'paragraph', content });
const t = (text: string, marks?: any[]) => ({ type: 'text', text, ...(marks ? { marks } : {}) });

describe('renderRichTextToHtml', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders empty output for null/undefined/empty docs', () => {
    expect(renderRichTextToHtml(null)).toBe('');
    expect(renderRichTextToHtml(undefined)).toBe('');
    expect(renderRichTextToHtml({ type: 'doc' })).toBe('');
  });

  it('renders paragraphs and escaped text', () => {
    expect(renderRichTextToHtml(doc(p(t('a < b & c'))))).toBe('<p>a &lt; b &amp; c</p>');
  });

  it('renders headings, falling back to h1 for invalid levels (TipTap behavior)', () => {
    expect(renderRichTextToHtml(doc({ type: 'heading', attrs: { level: 3 }, content: [t('Hi')] }))).toBe('<h3>Hi</h3>');
    expect(renderRichTextToHtml(doc({ type: 'heading', attrs: { level: 9 }, content: [t('Hi')] }))).toBe('<h1>Hi</h1>');
  });

  it('renders lists with nested paragraphs', () => {
    const list = { type: 'bulletList', content: [{ type: 'listItem', content: [p(t('One'))] }] };
    expect(renderRichTextToHtml(doc(list))).toBe('<ul><li><p>One</p></li></ul>');
  });

  it('emits orderedList start only when not 1', () => {
    const ol = (start: number) => ({ type: 'orderedList', attrs: { start }, content: [{ type: 'listItem', content: [p(t('x'))] }] });
    expect(renderRichTextToHtml(doc(ol(1)))).toBe('<ol><li><p>x</p></li></ol>');
    expect(renderRichTextToHtml(doc(ol(3)))).toBe('<ol start="3"><li><p>x</p></li></ol>');
  });

  it('renders codeBlock as pre>code with the language class on code', () => {
    const cb = { type: 'codeBlock', attrs: { language: 'js' }, content: [t('const x = 1;')] };
    expect(renderRichTextToHtml(doc(cb))).toBe('<pre><code class="language-js">const x = 1;</code></pre>');
  });

  it('folds marks with marks[0] outermost and merges adjacent shared marks', () => {
    const html = renderRichTextToHtml(doc(p(t('a', [{ type: 'bold' }]), t('b', [{ type: 'bold' }, { type: 'italic' }]))));
    expect(html).toBe('<p><strong>a<em>b</em></strong></p>');
  });

  it('merges a link spanning marked text into a single <a>', () => {
    const link = { type: 'link', attrs: { href: 'https://x.com', target: '_blank', rel: 'noopener noreferrer nofollow', class: null } };
    const html = renderRichTextToHtml(doc(p(t('go ', [link]), t('bold', [link, { type: 'bold' }]), t(' now', [link]))));
    expect(html).toBe('<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://x.com">go <strong>bold</strong> now</a></p>');
  });

  it('sanitizes javascript: hrefs to empty string', () => {
    const link = { type: 'link', attrs: { href: 'javascript:alert(1)' } };
    expect(renderRichTextToHtml(doc(p(t('x', [link]))))).toBe('<p><a href="">x</a></p>');
  });

  it('skips unknown node types with one dev warning per type per render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = renderRichTextToHtml(doc({ type: 'schema', attrs: { data: {} } }, { type: 'schema' }, p(t('kept'))));
    expect(html).toBe('<p>kept</p>');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('applies custom node renderers with pre-rendered children', () => {
    const html = renderRichTextToHtml(doc(p(t('Hello'))), {
      renderers: { paragraph: ({ children }) => `<div class="rt-p">${children}</div>` },
    });
    expect(html).toBe('<div class="rt-p">Hello</div>');
  });

  it('applies custom mark renderers', () => {
    const html = renderRichTextToHtml(doc(p(t('x', [{ type: 'bold' }]))), {
      renderers: { bold: ({ children }) => `<b class="loud">${children}</b>` },
    });
    expect(html).toBe('<p><b class="loud">x</b></p>');
  });

  it('prevents infinite loops: a custom renderer can re-render its node via props.context', () => {
    const html = renderRichTextToHtml(doc({ type: 'heading', attrs: { level: 2 }, content: [t('T')] }), {
      renderers: {
        heading: props =>
          `<section>${renderRichTextToHtml({ type: 'heading', attrs: props.attrs, content: props.content } as any, { renderers: props.context.renderers })}</section>`,
      },
    });
    expect(html).toBe('<section><h2>T</h2></section>');
  });
});
