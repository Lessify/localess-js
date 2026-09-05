import { emptyDocument, type RichTextParseOptions, type RichTextParseResult, UnsupportedTracker } from '../parse-common';
import { parseBlocks } from './block';

export type { RichTextParseOptions, RichTextParseResult, RichTextUnsupportedPolicy, RichTextUnsupportedReport } from '../parse-common';
export { RichTextParseError } from '../parse-common';

/**
 * Parses a Markdown string into a Localess rich text document.
 *
 * A documented **subset**, not CommonMark — the model is closed, so most of the
 * spec maps to nodes that do not exist.
 *
 * | Supported | Not supported |
 * |---|---|
 * | ATX (`# x`) and setext headings | tables |
 * | paragraphs | images |
 * | bullet and ordered lists (incl. nesting and `start`) | blockquotes |
 * | fenced and indented code blocks | thematic breaks |
 * | `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` | footnotes |
 * | `[text](href)` | reference links, autolinks |
 *
 * Unrepresentable constructs go through {@link RichTextParseOptions.unsupported}
 * and are listed in the result. Inline syntax with no model equivalent (images,
 * raw HTML) is kept as literal text rather than dropped.
 *
 * Link hrefs pass through the same allowlist the renderer applies.
 *
 * Never throws — except under `unsupported: 'throw'`.
 *
 * @example
 * ```ts
 * const { doc, unsupported } = parseMarkdownToRichText('# Title\n\nSome **bold** text.');
 * ```
 */
export function parseMarkdownToRichText(markdown: string | null | undefined, options: RichTextParseOptions = {}): RichTextParseResult {
  const tracker = new UnsupportedTracker(options);
  if (typeof markdown !== 'string' || markdown.trim() === '') {
    return { doc: emptyDocument(), unsupported: [] };
  }

  const nodes = parseBlocks(markdown, tracker);
  return { doc: { type: 'doc', content: nodes }, unsupported: tracker.report() };
}
