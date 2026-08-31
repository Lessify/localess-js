import type { LocalessRichTextInput } from '../model';

export interface RichTextFixture {
  title: string;
  input: LocalessRichTextInput;
  expected: string;
  parity: boolean;
}

const doc = (...content: any[]): any => ({ type: 'doc', content });
const p = (...content: any[]): any => ({ type: 'paragraph', content });
const t = (text: string, marks?: any[]): any => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const li = (...content: any[]): any => ({ type: 'listItem', content });
const link = { type: 'link', attrs: { href: 'https://example.com', target: '_blank', rel: 'noopener noreferrer nofollow', class: null } };

/**
 * Shared correctness corpus. Every renderer in every framework package must
 * produce exactly these strings (DOM-roundtrip-normalized where the framework
 * renders through a real DOM). `parity: true` fixtures are additionally
 * asserted byte-identical to TipTap's `generateHTML`.
 */
export const richTextFixtures: RichTextFixture[] = [
  { title: 'empty doc', input: doc(), expected: '', parity: true },
  { title: 'null input', input: null, expected: '', parity: false },
  { title: 'plain paragraph', input: doc(p(t('Hello world'))), expected: '<p>Hello world</p>', parity: true },
  { title: 'two paragraphs', input: doc(p(t('One')), p(t('Two'))), expected: '<p>One</p><p>Two</p>', parity: true },
  {
    title: 'all six heading levels',
    input: doc(...[1, 2, 3, 4, 5, 6].map(level => ({ type: 'heading', attrs: { level }, content: [t(`H${level}`)] }))),
    expected: '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>',
    parity: true,
  },
  {
    title: 'invalid heading level falls back to h1',
    input: doc({ type: 'heading', attrs: { level: 9 }, content: [t('Big')] }),
    expected: '<h1>Big</h1>',
    parity: true,
  },
  {
    title: 'every simple mark',
    input: doc(
      p(
        t('b', [{ type: 'bold' }]),
        t('i', [{ type: 'italic' }]),
        t('s', [{ type: 'strike' }]),
        t('u', [{ type: 'underline' }]),
        t('c', [{ type: 'code' }])
      )
    ),
    expected: '<p><strong>b</strong><em>i</em><s>s</s><u>u</u><code>c</code></p>',
    parity: true,
  },
  {
    title: 'nested marks fold with marks[0] outermost',
    input: doc(p(t('x', [{ type: 'bold' }, { type: 'italic' }]))),
    expected: '<p><strong><em>x</em></strong></p>',
    parity: true,
  },
  {
    title: 'adjacent nodes sharing an outer mark merge into one wrapper',
    input: doc(p(t('a', [{ type: 'bold' }]), t('b', [{ type: 'bold' }, { type: 'italic' }]))),
    expected: '<p><strong>a<em>b</em></strong></p>',
    parity: true,
  },
  {
    title: 'bullet list with paragraphs in items',
    input: doc({ type: 'bulletList', content: [li(p(t('One'))), li(p(t('Two')))] }),
    expected: '<ul><li><p>One</p></li><li><p>Two</p></li></ul>',
    parity: true,
  },
  {
    title: 'ordered list omits start=1',
    input: doc({ type: 'orderedList', attrs: { start: 1 }, content: [li(p(t('One')))] }),
    expected: '<ol><li><p>One</p></li></ol>',
    parity: true,
  },
  {
    title: 'ordered list emits start=3',
    input: doc({ type: 'orderedList', attrs: { start: 3 }, content: [li(p(t('Three')))] }),
    expected: '<ol start="3"><li><p>Three</p></li></ol>',
    parity: true,
  },
  {
    title: 'nested bullet list inside a list item',
    input: doc({
      type: 'bulletList',
      content: [li(p(t('Outer')), { type: 'bulletList', content: [li(p(t('Inner')))] })],
    }),
    expected: '<ul><li><p>Outer</p><ul><li><p>Inner</p></li></ul></li></ul>',
    parity: true,
  },
  {
    title: 'code block without language',
    input: doc({ type: 'codeBlock', attrs: { language: null }, content: [t('const x = 1;')] }),
    expected: '<pre><code>const x = 1;</code></pre>',
    parity: true,
  },
  {
    title: 'code block with language class',
    input: doc({ type: 'codeBlock', attrs: { language: 'js' }, content: [t('const x = 1;')] }),
    expected: '<pre><code class="language-js">const x = 1;</code></pre>',
    parity: true,
  },
  {
    title: 'link with editor-default attrs',
    input: doc(p(t('Visit', [link]))),
    expected: '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">Visit</a></p>',
    parity: true,
  },
  {
    title: 'link spanning differently-marked text renders one anchor',
    input: doc(p(t('go ', [link]), t('bold', [link, { type: 'bold' }]), t(' now', [link]))),
    expected: '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">go <strong>bold</strong> now</a></p>',
    parity: true,
  },
  {
    title: 'text escaping of angle brackets and ampersands',
    input: doc(p(t('a < b & c > d'))),
    expected: '<p>a &lt; b &amp; c &gt; d</p>',
    parity: true,
  },
  {
    title: 'javascript: href is sanitized to empty (intentionally stricter than TipTap)',
    input: doc(p(t('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))),
    expected: '<p><a href="">x</a></p>',
    parity: false,
  },
  {
    title: 'unknown node types are skipped',
    input: doc({ type: 'schema', attrs: { data: {} } }, p(t('kept'))),
    expected: '<p>kept</p>',
    parity: false,
  },
];
