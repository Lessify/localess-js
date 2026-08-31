import type { LocalessRichTextMark } from './model';

export interface MarkTreeText {
  kind: 'text';
  text: string;
}
export interface MarkTreeMark {
  kind: 'mark';
  mark: LocalessRichTextMark;
  children: MarkTreeSegment[];
}
export type MarkTreeSegment = MarkTreeText | MarkTreeMark;

/** Deep equality of two marks (type + attrs). Attr key order must match, which holds for editor-produced documents. */
export function marksEqual(a: LocalessRichTextMark, b: LocalessRichTextMark): boolean {
  return a.type === b.type && JSON.stringify((a as any).attrs ?? {}) === JSON.stringify((b as any).attrs ?? {});
}

/**
 * Folds a run of consecutive text nodes into a tree in which adjacent nodes
 * sharing the same outer marks share one wrapper — the same merging
 * ProseMirror's DOM serializer performs, so output matches TipTap's
 * `generateHTML` (one `<a>` per link span, `<strong>a<em>b</em></strong>`
 * instead of sibling `<strong>` wrappers).
 */
export function buildMarkTree(nodes: Array<{ text: string; marks?: LocalessRichTextMark[] }>): MarkTreeSegment[] {
  const root: MarkTreeSegment[] = [];
  const stack: MarkTreeMark[] = [];

  for (const node of nodes) {
    const marks = node.marks ?? [];
    let depth = 0;
    while (depth < stack.length && depth < marks.length && marksEqual(stack[depth].mark, marks[depth])) {
      depth++;
    }
    stack.length = depth;
    for (let i = depth; i < marks.length; i++) {
      const segment: MarkTreeMark = { kind: 'mark', mark: marks[i], children: [] };
      (stack.length > 0 ? stack[stack.length - 1].children : root).push(segment);
      stack.push(segment);
    }
    (stack.length > 0 ? stack[stack.length - 1].children : root).push({ kind: 'text', text: node.text });
  }
  return root;
}
