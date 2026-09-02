/**
 * Attributes of a `link` mark as stored by the Localess Studio editor
 * (TipTap Link extension JSON).
 */
export interface LocalessRichTextLinkAttrs {
  href: string;
  target?: string | null;
  rel?: string | null;
  class?: string | null;
}

/**
 * A rich text mark — inline formatting applied to a `text` node.
 * Exactly the mark set the Localess Studio editor can produce.
 */
export type LocalessRichTextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'strike' }
  | { type: 'underline' }
  | { type: 'code' }
  | { type: 'link'; attrs: LocalessRichTextLinkAttrs };

/**
 * A rich text node — exactly the node set the Localess Studio editor can produce.
 */
export type LocalessRichTextNode =
  | { type: 'paragraph'; content?: LocalessRichTextNode[] }
  | { type: 'heading'; attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 }; content?: LocalessRichTextNode[] }
  | { type: 'bulletList'; content?: LocalessRichTextNode[] }
  | { type: 'orderedList'; attrs?: { start?: number }; content?: LocalessRichTextNode[] }
  | { type: 'listItem'; content?: LocalessRichTextNode[] }
  | { type: 'codeBlock'; attrs?: { language?: string | null }; content?: LocalessRichTextNode[] }
  | { type: 'text'; text: string; marks?: LocalessRichTextMark[] };

/** A node with an optional stable key injected by `normalizeInput(input, { withKeys: true })`. */
export type LocalessRichTextNodeWithKey = LocalessRichTextNode & { _key?: string };

/** The root document node (`getJSON()` output of the Studio editor). */
export interface LocalessRichTextDocument {
  type: 'doc';
  content?: LocalessRichTextNode[];
}

/**
 * Re-exported from `@localess/model` so `LocalessRichTextInput` accepts
 * `ContentRichText` values without casting.
 */
export type { ContentRichText } from '@localess/model';

/** Anything a render function accepts. */
export type LocalessRichTextInput =
  LocalessRichTextDocument | LocalessRichTextNode | LocalessRichTextNode[] | ContentRichText | null | undefined;

/** Union of every known node and mark type name. */
export type LocalessRichTextElement = LocalessRichTextNode['type'] | LocalessRichTextMark['type'] | 'doc';

/**
 * Props passed to a custom renderer. `children` is the pre-rendered content of
 * the node/mark; `context.renderers` is the override map with the current
 * type unset (loop prevention) for safe re-entrant rendering.
 */
export interface LocalessRichTextRendererProps<TOut> {
  type: string;
  attrs?: Record<string, any>;
  text?: string;
  marks?: LocalessRichTextMark[];
  content?: LocalessRichTextNode[];
  children: TOut;
  context: { renderers?: LocalessRichTextRenderers<TOut> };
  _key?: string;
}

/** A custom renderer for one node or mark type. */
export type LocalessRichTextRenderer<TOut> = (props: LocalessRichTextRendererProps<TOut>) => TOut;

/**
 * Override map: node/mark type name → custom renderer. Unknown type names are
 * allowed — that is the forward-compat seam for future node types.
 */
export type LocalessRichTextRenderers<TOut> = Record<string, LocalessRichTextRenderer<TOut> | undefined>;
