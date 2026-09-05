import { sanitizeUrl } from '../escape';
import type { LocalessRichTextMark, LocalessRichTextNode } from '../model';
import { type UnsupportedTracker } from '../parse-common';
import { type HtmlToken } from './tokenizer';

/** Tag → mark, the inverse of `MARK_RENDER_MAP`. `b`/`i`/`del`/`s` are accepted as aliases. */
const MARK_TAGS: Record<string, LocalessRichTextMark['type']> = {
  strong: 'bold',
  b: 'bold',
  em: 'italic',
  i: 'italic',
  s: 'strike',
  strike: 'strike',
  del: 'strike',
  u: 'underline',
  code: 'code',
  a: 'link',
};

const HEADING_TAGS: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

/** Block tags the model represents directly. */
const BLOCK_TAGS = new Set(['p', 'ul', 'ol', 'li', 'pre', ...Object.keys(HEADING_TAGS)]);

/** Tags that carry no meaning of their own — their children are simply kept. */
const TRANSPARENT_TAGS = new Set(['html', 'body', 'head', 'div', 'section', 'article', 'main', 'span', 'font', 'tbody', 'thead']);

/** Tags dropped entirely, content and all, regardless of policy. */
const DROPPED_TAGS = new Set(['script', 'style', 'title', 'meta', 'link', 'base', 'noscript']);

interface Frame {
  /** Tag that opened this frame, or `''` for the root. */
  tag: string;
  /** Node being built, or `null` for a transparent/unwrapped frame. */
  node: LocalessRichTextNode | null;
  /** Where children accumulate. */
  children: LocalessRichTextNode[];
  /** Marks active for text inside this frame. */
  marks: LocalessRichTextMark[];
  /** Set when the frame is inside `<pre>`, where whitespace is significant. */
  preformatted: boolean;
}

function linkMark(attrs: Record<string, string>): LocalessRichTextMark {
  return {
    type: 'link',
    attrs: {
      // The same allowlist the renderer applies on the way out. Parsing
      // untrusted HTML is the more security-sensitive direction.
      href: sanitizeUrl(attrs.href ?? ''),
      target: attrs.target ?? null,
      rel: attrs.rel ?? null,
      class: attrs.class ?? null,
    },
  };
}

function codeBlockLanguage(attrs: Record<string, string>): string | null {
  const className = attrs.class ?? '';
  const match = /(?:^|\s)language-([^\s]+)/.exec(className);
  return match ? match[1] : null;
}

/** Collapses HTML whitespace the way a browser would for non-preformatted text. */
function collapseWhitespace(text: string): string {
  return text.replace(/[\t\n\r ]+/g, ' ');
}

function isBlockNode(node: LocalessRichTextNode): boolean {
  return node.type !== 'text';
}

/**
 * Folds a token stream into model nodes.
 *
 * Text is only kept where the model can hold it — inside a block node. Text
 * found at the top level is wrapped in a paragraph, matching what the editor
 * would produce.
 */
export function tokensToNodes(tokens: HtmlToken[], tracker: UnsupportedTracker): LocalessRichTextNode[] {
  const root: Frame = { tag: '', node: null, children: [], marks: [], preformatted: false };
  const stack: Frame[] = [root];
  const top = () => stack[stack.length - 1];

  /** Blocks skipped wholesale; text inside them is discarded. */
  let skipDepth = 0;
  let skipTag = '';

  const appendText = (text: string) => {
    const frame = top();
    if (text === '') return;
    const node: LocalessRichTextNode = { type: 'text', text, ...(frame.marks.length ? { marks: [...frame.marks] } : {}) };
    // Loose text at the root has nowhere to live; give it a paragraph.
    if (frame === root) {
      const last = root.children[root.children.length - 1];
      if (last && last.type === 'paragraph') (last.content ??= []).push(node);
      else root.children.push({ type: 'paragraph', content: [node] });
      return;
    }
    frame.children.push(node);
  };

  const closeFrame = () => {
    const frame = stack.pop()!;
    const parent = top();
    if (frame.node) {
      if (frame.children.length) (frame.node as any).content = frame.children;
      parent.children.push(frame.node);
    } else {
      parent.children.push(...frame.children);
    }
  };

  for (const token of tokens) {
    if (skipDepth > 0) {
      if (token.kind === 'open' && token.name === skipTag && !token.selfClosing) skipDepth++;
      else if (token.kind === 'close' && token.name === skipTag) skipDepth--;
      continue;
    }

    if (token.kind === 'text') {
      const frame = top();
      const text = frame.preformatted ? token.text : collapseWhitespace(token.text);
      // Whitespace between block tags is layout, not content.
      if (!frame.preformatted && text.trim() === '' && (frame === root || frame.children.every(isBlockNode))) continue;
      appendText(text);
      continue;
    }

    if (token.kind === 'close') {
      const depth = stack.findIndex(frame => frame.tag === token.name);
      if (depth <= 0) continue; // Stray close tag.
      while (stack.length > depth) closeFrame();
      continue;
    }

    const { name, attrs, selfClosing } = token;

    if (DROPPED_TAGS.has(name)) {
      if (!selfClosing) {
        skipDepth = 1;
        skipTag = name;
      }
      continue;
    }

    if (name === 'br') {
      appendText(' ');
      continue;
    }

    const markType = MARK_TAGS[name];
    if (markType) {
      const frame = top();
      // The renderer emits `codeBlock` as `<pre><code class="language-x">`, so a
      // `<code>` directly inside `<pre>` is that wrapper — it carries the
      // language, and must not become a `code` mark.
      if (name === 'code' && frame.tag === 'pre' && frame.node?.type === 'codeBlock') {
        const language = codeBlockLanguage(attrs);
        if (language) (frame.node as any).attrs = { language };
        if (selfClosing) continue;
        stack.push({ tag: name, node: null, children: [], marks: [...frame.marks], preformatted: true });
        continue;
      }
      const mark: LocalessRichTextMark = markType === 'link' ? linkMark(attrs) : ({ type: markType } as LocalessRichTextMark);
      if (selfClosing) continue;
      stack.push({ tag: name, node: null, children: [], marks: [...frame.marks, mark], preformatted: frame.preformatted });
      continue;
    }

    if (TRANSPARENT_TAGS.has(name)) {
      if (selfClosing) continue;
      const frame = top();
      stack.push({ tag: name, node: null, children: [], marks: [...frame.marks], preformatted: frame.preformatted });
      continue;
    }

    if (BLOCK_TAGS.has(name)) {
      const frame = top();
      let node: LocalessRichTextNode;
      let preformatted = frame.preformatted;

      if (name === 'p') node = { type: 'paragraph' };
      else if (name in HEADING_TAGS) node = { type: 'heading', attrs: { level: HEADING_TAGS[name] } };
      else if (name === 'ul') node = { type: 'bulletList' };
      else if (name === 'ol') {
        const start = Number.parseInt(attrs.start ?? '', 10);
        node = Number.isFinite(start) && start !== 1 ? { type: 'orderedList', attrs: { start } } : { type: 'orderedList' };
      } else if (name === 'li') node = { type: 'listItem' };
      else {
        node = { type: 'codeBlock' };
        preformatted = true;
      }

      if (selfClosing) {
        frame.children.push(node);
        continue;
      }
      stack.push({ tag: name, node, children: [], marks: [...frame.marks], preformatted });
      continue;
    }

    // Anything else has no representation — apply the configured policy.
    const action = tracker.record(name);
    if (selfClosing) continue;
    if (action === 'skip') {
      skipDepth = 1;
      skipTag = name;
      continue;
    }
    const frame = top();
    stack.push({ tag: name, node: null, children: [], marks: [...frame.marks], preformatted: frame.preformatted });
  }

  while (stack.length > 1) closeFrame();
  return finalize(root.children);
}

/**
 * Post-pass matching the model's shape rules:
 * `<pre>` wraps a `<code>` in the renderer, so the parser lifts that `code`
 * mark back onto the `codeBlock`'s `language`, and list items always hold
 * blocks rather than bare text.
 */
function finalize(nodes: LocalessRichTextNode[]): LocalessRichTextNode[] {
  return nodes.map(node => {
    if (node.type === 'text') return node;
    const content = (node as any).content as LocalessRichTextNode[] | undefined;
    if (!content) return node;

    if (node.type === 'codeBlock') {
      // A code block holds one plain text run; marks inside it are meaningless.
      const text = flattenText(content);
      const next: LocalessRichTextNode = {
        type: 'codeBlock',
        ...((node as any).attrs ? { attrs: (node as any).attrs } : {}),
      } as LocalessRichTextNode;
      if (text !== '') (next as any).content = [{ type: 'text', text }];
      return next;
    }

    const finalized = finalize(content);
    if (node.type === 'listItem' && finalized.some(child => child.type === 'text')) {
      // A bare `<li>text</li>` becomes `listItem > paragraph > text`.
      const wrapped: LocalessRichTextNode[] = [];
      let run: LocalessRichTextNode[] = [];
      for (const child of finalized) {
        if (child.type === 'text') run.push(child);
        else {
          if (run.length) {
            wrapped.push({ type: 'paragraph', content: run });
            run = [];
          }
          wrapped.push(child);
        }
      }
      if (run.length) wrapped.push({ type: 'paragraph', content: run });
      return { ...(node as any), content: wrapped };
    }

    return { ...(node as any), content: finalized };
  });
}

function flattenText(nodes: LocalessRichTextNode[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') out += node.text;
    else out += flattenText(((node as any).content ?? []) as LocalessRichTextNode[]);
  }
  return out;
}
