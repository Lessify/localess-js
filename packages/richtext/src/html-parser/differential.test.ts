import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import type { LocalessRichTextMark, LocalessRichTextNode } from '../model';
import { parseHtmlToRichText } from './index';

/**
 * Differential test against a real DOM.
 *
 * The hand-written tokenizer exists so behaviour is identical across runtimes
 * without a dependency, but it must still agree with a conforming parser on the
 * subset it claims to support. `happy-dom` is a devDependency only — the same
 * pattern the package already uses for the TipTap parity test.
 *
 * Compared on structure (tag/text tree), not bytes: the model is lossy by
 * design, so attributes a real DOM keeps and the model discards are not
 * meaningful differences.
 */
const window = new Window();

function domStructure(html: string): string {
  const document = window.document.implementation.createHTMLDocument();
  document.body.innerHTML = html;
  return serializeDom(document.body as unknown as Element).trim();
}

function serializeDom(element: Element): string {
  let out = '';
  for (const child of Array.from(element.childNodes) as any[]) {
    if (child.nodeType === 3) {
      const text = String(child.textContent ?? '').replace(/\s+/g, ' ');
      if (text.trim() !== '') out += text;
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = String(child.tagName).toLowerCase();
    out += `<${tag}>${serializeDom(child)}</${tag}>`;
  }
  return out;
}

function modelStructure(nodes: LocalessRichTextNode[] | undefined): string {
  let out = '';
  for (const node of nodes ?? []) {
    if (node.type === 'text') {
      out += wrapMarks(node.text, node.marks);
      continue;
    }
    const tag = TAG_FOR[node.type]?.((node as any).attrs) ?? node.type;
    const inner = modelStructure((node as any).content);
    out += node.type === 'codeBlock' ? `<pre><code>${inner}</code></pre>` : `<${tag}>${inner}</${tag}>`;
  }
  return out;
}

const TAG_FOR: Record<string, (attrs: any) => string> = {
  paragraph: () => 'p',
  heading: attrs => `h${attrs?.level ?? 1}`,
  bulletList: () => 'ul',
  orderedList: () => 'ol',
  listItem: () => 'li',
};

const MARK_TAG: Record<LocalessRichTextMark['type'], string> = {
  bold: 'strong',
  italic: 'em',
  strike: 's',
  underline: 'u',
  code: 'code',
  link: 'a',
};

function wrapMarks(text: string, marks: LocalessRichTextMark[] | undefined): string {
  let out = text.replace(/\s+/g, ' ');
  for (let i = (marks?.length ?? 0) - 1; i >= 0; i--) {
    const tag = MARK_TAG[marks![i].type];
    out = `<${tag}>${out}</${tag}>`;
  }
  return out;
}

describe('agrees with DOMParser on the supported subset', () => {
  const cases = [
    '<p>Hello world</p>',
    '<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>',
    '<p><strong>bold</strong> and <em>italic</em> and <s>strike</s> and <u>under</u></p>',
    '<p><strong><em>nested</em></strong></p>',
    '<ul><li><p>a</p></li><li><p>b</p></li></ul>',
    '<ol><li><p>a</p></li></ol>',
    '<pre><code>x = 1</code></pre>',
    '<p><a href="https://example.com">link</a></p>',
    '<p>one</p><p>two</p>',
    '<ul><li><p>a</p><ul><li><p>nested</p></li></ul></li></ul>',
  ];

  for (const html of cases) {
    it(`matches for ${html.slice(0, 48)}`, () => {
      const { doc } = parseHtmlToRichText(html);

      expect(modelStructure(doc.content)).toBe(domStructure(html));
    });
  }
});
