import { emptyDocument, type RichTextParseOptions, type RichTextParseResult, UnsupportedTracker } from '../parse-common';
import { tokensToNodes } from './to-model';
import { tokenizeHtml } from './tokenizer';

export type { RichTextParseOptions, RichTextParseResult, RichTextUnsupportedPolicy, RichTextUnsupportedReport } from '../parse-common';
export { RichTextParseError } from '../parse-common';

/**
 * Parses an HTML string into a Localess rich text document.
 *
 * The inverse of `renderRichTextToHtml`, and deliberately a **subset** parser:
 * it understands the tags the Localess model can represent and routes
 * everything else through {@link RichTextParseOptions.unsupported}. It is not
 * HTML5-conformant and does not attempt full error recovery — the trade is
 * identical behaviour across browsers, Node, and edge runtimes with no
 * dependency.
 *
 * Supported: `p`, `h1`–`h6`, `ul`, `ol` (with `start`), `li`, `pre`/`code`
 * blocks (with `language-*`), and the marks `strong`/`b`, `em`/`i`,
 * `s`/`strike`/`del`, `u`, `code`, `a`. Structural wrappers such as `div` and
 * `span` are transparent; `script` and `style` are always dropped.
 *
 * Link hrefs pass through the same allowlist the renderer applies, so
 * `javascript:` and `data:` become `""`.
 *
 * Never throws for malformed input — except under `unsupported: 'throw'`.
 *
 * @example
 * ```ts
 * const { doc, unsupported } = parseHtmlToRichText('<p>Hello <strong>world</strong></p>');
 * ```
 */
export function parseHtmlToRichText(html: string | null | undefined, options: RichTextParseOptions = {}): RichTextParseResult {
  const tracker = new UnsupportedTracker(options);
  if (typeof html !== 'string' || html === '') {
    return { doc: emptyDocument(), unsupported: [] };
  }

  const nodes = tokensToNodes(tokenizeHtml(html), tracker);
  return { doc: { type: 'doc', content: nodes }, unsupported: tracker.report() };
}
