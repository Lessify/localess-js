/** Declarative default rendering for one node/mark type. */
export interface RichTextRenderSpec {
  tag?: string;
  /** Dynamic tag resolution (heading levels). Wins over `tag`. */
  resolve?: (attrs: Record<string, any> | undefined) => string;
  /** Render children inside this element. */
  content?: boolean;
  /** Static nested structure; node attrs attach to the child with `content: true`. */
  children?: Array<{ tag: string; content?: boolean }>;
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

/** Invalid levels fall back to h1, matching TipTap's first-configured-level behavior. */
export function resolveHeadingTag(attrs: Record<string, any> | undefined): string {
  const level = attrs?.level;
  return `h${HEADING_LEVELS.includes(level) ? level : 1}`;
}

/** `null` = transparent (render children only, no element). Missing key = unknown type. */
export const NODE_RENDER_MAP: Record<string, RichTextRenderSpec | null> = {
  doc: null,
  text: null,
  paragraph: { tag: 'p', content: true },
  heading: { resolve: resolveHeadingTag, content: true },
  bulletList: { tag: 'ul', content: true },
  orderedList: { tag: 'ol', content: true },
  listItem: { tag: 'li', content: true },
  codeBlock: { tag: 'pre', children: [{ tag: 'code', content: true }] },
};

export const MARK_RENDER_MAP: Record<string, RichTextRenderSpec> = {
  bold: { tag: 'strong', content: true },
  italic: { tag: 'em', content: true },
  strike: { tag: 's', content: true },
  underline: { tag: 'u', content: true },
  code: { tag: 'code', content: true },
  link: { tag: 'a', content: true },
};
