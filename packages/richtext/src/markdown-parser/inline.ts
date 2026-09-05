import { sanitizeUrl } from '../escape';
import type { LocalessRichTextMark, LocalessRichTextNode } from '../model';

/**
 * Parses Markdown inline content into text nodes with marks.
 *
 * Supported: `**strong**`/`__strong__`, `*em*`/`_em_`, `~~strike~~`,
 * `` `code` ``, `[text](href)`, and `\` escapes. Everything else — images,
 * reference links, autolinks, HTML — is left as literal text, since the model
 * has nowhere to put it.
 *
 * Code spans win over every other marker, matching CommonMark: the contents of
 * `` `**x**` `` are literal.
 */
export function parseInline(source: string, marks: LocalessRichTextMark[] = []): LocalessRichTextNode[] {
  const nodes: LocalessRichTextNode[] = [];
  let text = '';
  let index = 0;

  const flush = () => {
    if (text === '') return;
    nodes.push({ type: 'text', text, ...(marks.length ? { marks: [...marks] } : {}) });
    text = '';
  };

  const push = (children: LocalessRichTextNode[]) => {
    flush();
    nodes.push(...children);
  };

  while (index < source.length) {
    const char = source[index];

    if (char === '\\' && index + 1 < source.length && /[\\`*_~[\]()#+\-.!>]/.test(source[index + 1])) {
      text += source[index + 1];
      index += 2;
      continue;
    }

    if (char === '`') {
      const fence = /^`+/.exec(source.slice(index))![0];
      const close = source.indexOf(fence, index + fence.length);
      if (close !== -1) {
        const code = source.slice(index + fence.length, close);
        flush();
        nodes.push({ type: 'text', text: code, marks: [...marks, { type: 'code' }] });
        index = close + fence.length;
        continue;
      }
    }

    if (char === '[') {
      const link = matchLink(source, index);
      if (link) {
        push(parseInline(link.label, [...marks, link.mark]));
        index = link.end;
        continue;
      }
    }

    const emphasis = matchEmphasis(source, index);
    if (emphasis) {
      push(parseInline(emphasis.inner, [...marks, emphasis.mark]));
      index = emphasis.end;
      continue;
    }

    text += char;
    index++;
  }

  flush();
  return nodes;
}

interface EmphasisMatch {
  inner: string;
  mark: LocalessRichTextMark;
  end: number;
}

const DELIMITERS: Array<{ token: string; type: LocalessRichTextMark['type'] }> = [
  { token: '~~', type: 'strike' },
  { token: '**', type: 'bold' },
  { token: '__', type: 'bold' },
  { token: '*', type: 'italic' },
  { token: '_', type: 'italic' },
];

function matchEmphasis(source: string, index: number): EmphasisMatch | null {
  for (const { token, type } of DELIMITERS) {
    if (!source.startsWith(token, index)) continue;
    const contentStart = index + token.length;
    const close = findClosing(source, token, contentStart);
    if (close === -1) continue;
    const inner = source.slice(contentStart, close);
    // `**` with nothing between is literal, not empty emphasis.
    if (inner === '') continue;
    return { inner, mark: { type } as LocalessRichTextMark, end: close + token.length };
  }
  return null;
}

/**
 * Finds the closing delimiter for an emphasis run.
 *
 * When the closing run is longer than the delimiter — `***` closing a `**` —
 * the delimiter is taken from the **end** of the run, leaving the leading
 * characters to close any inner emphasis. That is what makes
 * `**bold *and italic***` nest correctly instead of ending the strong early.
 */
function findClosing(source: string, token: string, from: number): number {
  const char = token[0];
  let index = from;
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
      continue;
    }
    if (source[index] === char) {
      let runEnd = index;
      while (runEnd < source.length && source[runEnd] === char) runEnd++;
      if (runEnd - index >= token.length) return runEnd - token.length;
      index = runEnd;
      continue;
    }
    index++;
  }
  return -1;
}

interface LinkMatch {
  label: string;
  mark: LocalessRichTextMark;
  end: number;
}

function matchLink(source: string, index: number): LinkMatch | null {
  let depth = 0;
  let labelEnd = -1;
  for (let i = index; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) {
        labelEnd = i;
        break;
      }
    }
  }
  if (labelEnd === -1 || source[labelEnd + 1] !== '(') return null;

  let parens = 0;
  let targetEnd = -1;
  for (let i = labelEnd + 1; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '(') parens++;
    else if (char === ')') {
      parens--;
      if (parens === 0) {
        targetEnd = i;
        break;
      }
    }
  }
  if (targetEnd === -1) return null;

  const target = source.slice(labelEnd + 2, targetEnd).trim();

  // `<...>` may contain spaces, so unwrap before splitting. Outside brackets the
  // first whitespace ends the destination — what follows is a Markdown title,
  // which has no model representation and is dropped.
  let href: string;
  if (target.startsWith('<')) {
    const close = target.indexOf('>');
    href = close === -1 ? target.slice(1) : target.slice(1, close);
  } else {
    href = target.split(/\s+/)[0] ?? '';
  }

  return {
    label: source.slice(index + 1, labelEnd),
    mark: { type: 'link', attrs: { href: sanitizeUrl(href), target: null, rel: null, class: null } },
    end: targetEnd + 1,
  };
}
