import type { LocalessRichTextNode } from '../model';
import { type UnsupportedTracker } from '../parse-common';
import { parseInline } from './inline';

const ATX_HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)\s*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;
const BULLET_ITEM = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const THEMATIC_BREAK = /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const BLOCKQUOTE = /^ {0,3}> ?(.*)$/;

/** Constructs the model cannot represent, reported through the unsupported policy. */
const UNSUPPORTED_BLOCKS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: THEMATIC_BREAK, name: 'thematic break' },
  { pattern: BLOCKQUOTE, name: 'blockquote' },
];

/**
 * Parses Markdown block structure into model nodes.
 *
 * A documented **subset**, not CommonMark: ATX and setext headings,
 * paragraphs, bullet and ordered lists, fenced and indented code blocks. Tables,
 * images, blockquotes, thematic breaks, footnotes, and reference links have no
 * representation in the model and go through the unsupported policy.
 */
export function parseBlocks(markdown: string, tracker: UnsupportedTracker): LocalessRichTextNode[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  return parseLines(lines, tracker);
}

function parseLines(lines: string[], tracker: UnsupportedTracker): LocalessRichTextNode[] {
  const nodes: LocalessRichTextNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const language = fence[2] || null;
      const body: string[] = [];
      index++;
      while (index < lines.length && !new RegExp(`^ {0,3}${marker}{${fence[1].length},}\\s*$`).test(lines[index])) {
        body.push(lines[index]);
        index++;
      }
      index++; // closing fence (or end of input)
      nodes.push(codeBlock(body.join('\n'), language));
      continue;
    }

    // Indented code block: four spaces, and not a list continuation.
    if (/^ {4}/.test(line) && line.trim() !== '') {
      const body: string[] = [];
      while (index < lines.length && (/^ {4}/.test(lines[index]) || lines[index].trim() === '')) {
        if (lines[index].trim() === '' && !hasMoreIndented(lines, index)) break;
        body.push(lines[index].replace(/^ {4}/, ''));
        index++;
      }
      nodes.push(codeBlock(body.join('\n'), null));
      continue;
    }

    const atx = ATX_HEADING.exec(line);
    if (atx) {
      const level = atx[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      nodes.push({ type: 'heading', attrs: { level }, content: parseInline(atx[2]) });
      index++;
      continue;
    }

    const listItem = BULLET_ITEM.exec(line) ?? ORDERED_ITEM.exec(line);
    if (listItem) {
      const [list, consumed] = parseList(lines, index, tracker);
      nodes.push(list);
      index = consumed;
      continue;
    }

    const unsupportedBlock = UNSUPPORTED_BLOCKS.find(entry => entry.pattern.test(line));
    if (unsupportedBlock) {
      const action = tracker.record(unsupportedBlock.name);
      if (action === 'skip') {
        index++;
        continue;
      }
      // Unwrap: keep the text, drop the construct.
      const inner = BLOCKQUOTE.exec(line)?.[1] ?? '';
      if (inner.trim() !== '') nodes.push({ type: 'paragraph', content: parseInline(inner) });
      index++;
      continue;
    }

    // Paragraph, possibly closed by a setext underline.
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== '') {
      const current = lines[index];
      if (paragraph.length > 0 && SETEXT_UNDERLINE.test(current)) {
        const level = current.trim().startsWith('=') ? 1 : 2;
        nodes.push({ type: 'heading', attrs: { level }, content: parseInline(paragraph.join(' ')) });
        index++;
        break;
      }
      if (
        paragraph.length > 0 &&
        (ATX_HEADING.test(current) || FENCE.test(current) || BULLET_ITEM.test(current) || ORDERED_ITEM.test(current))
      ) {
        break;
      }
      paragraph.push(current.trim());
      index++;
      if (index <= lines.length && paragraph.length > 0 && index < lines.length && SETEXT_UNDERLINE.test(lines[index])) continue;
    }
    if (paragraph.length > 0 && nodes[nodes.length - 1]?.type !== 'heading') {
      nodes.push({ type: 'paragraph', content: parseInline(paragraph.join(' ')) });
    } else if (paragraph.length > 0 && !wasConsumedAsHeading(nodes, paragraph)) {
      nodes.push({ type: 'paragraph', content: parseInline(paragraph.join(' ')) });
    }
  }

  return nodes;
}

/** A blank line inside an indented code block only continues it if more indented content follows. */
function hasMoreIndented(lines: string[], index: number): boolean {
  for (let i = index + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    return /^ {4}/.test(lines[i]);
  }
  return false;
}

function wasConsumedAsHeading(nodes: LocalessRichTextNode[], paragraph: string[]): boolean {
  const last = nodes[nodes.length - 1];
  if (!last || last.type !== 'heading') return false;
  const text = (last.content ?? []).map(node => (node.type === 'text' ? node.text : '')).join('');
  return text === paragraph.join(' ');
}

function codeBlock(text: string, language: string | null): LocalessRichTextNode {
  const node: any = { type: 'codeBlock' };
  if (language) node.attrs = { language };
  if (text !== '') node.content = [{ type: 'text', text }];
  return node as LocalessRichTextNode;
}

/** Parses one list and its nested lists, returning the node and the next line index. */
function parseList(lines: string[], start: number, tracker: UnsupportedTracker): [LocalessRichTextNode, number] {
  const first = BULLET_ITEM.exec(lines[start]) ?? ORDERED_ITEM.exec(lines[start])!;
  const ordered = ORDERED_ITEM.test(lines[start]);
  const baseIndent = first[1].length;

  const items: LocalessRichTextNode[] = [];
  let index = start;
  let startNumber: number | undefined;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      const next = lines[index + 1];
      if (next === undefined || (next.trim() !== '' && indentOf(next) < baseIndent + 1 && !isItem(next))) break;
      index++;
      continue;
    }

    const match = BULLET_ITEM.exec(line) ?? ORDERED_ITEM.exec(line);
    if (!match || indentOf(line) < baseIndent) break;
    if (indentOf(line) > baseIndent) break; // Handled as nested content below.
    if (ORDERED_ITEM.test(line) !== ordered) break;

    if (ordered && startNumber === undefined) startNumber = Number.parseInt((match as RegExpExecArray)[2], 10);

    const body = ordered ? (match as RegExpExecArray)[3] : (match as RegExpExecArray)[2];
    const childLines = [body];
    index++;

    // Continuation and nested lines belong to this item.
    while (index < lines.length) {
      const candidate = lines[index];
      if (candidate.trim() === '') {
        const next = lines[index + 1];
        if (next !== undefined && indentOf(next) > baseIndent) {
          childLines.push('');
          index++;
          continue;
        }
        break;
      }
      if (indentOf(candidate) > baseIndent) {
        childLines.push(candidate.slice(baseIndent + 2));
        index++;
        continue;
      }
      break;
    }

    items.push({ type: 'listItem', content: parseLines(childLines, tracker) });
  }

  const node: any = ordered ? { type: 'orderedList' } : { type: 'bulletList' };
  if (ordered && startNumber !== undefined && startNumber !== 1) node.attrs = { start: startNumber };
  node.content = items;
  return [node as LocalessRichTextNode, index];
}

function indentOf(line: string): number {
  return /^\s*/.exec(line)![0].length;
}

function isItem(line: string): boolean {
  return BULLET_ITEM.test(line) || ORDERED_ITEM.test(line);
}
