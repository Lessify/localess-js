const TEXT_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const ATTR_ESCAPES: Record<string, string> = { ...TEXT_ESCAPES, '"': '&quot;' };

/**
 * Escapes text content for safe HTML output. The escape set (`& < >`) matches
 * TipTap's `generateHTML` DOM serialization — parity-tested; do not widen it
 * without updating the parity fixtures.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, ch => TEXT_ESCAPES[ch]);
}

/** Escapes an attribute value for safe double-quoted HTML output (`& " < >`). */
export function escapeAttr(value: string): string {
  return value.replace(/[&"<>]/g, ch => ATTR_ESCAPES[ch]);
}

const SAFE_SCHEME = /^(?:https?:|mailto:|tel:)/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// eslint-disable-next-line no-control-regex
const C0_CONTROL_OR_SPACE_EDGES = /^[\u0000- ]+|[\u0000- ]+$/g;
const TAB_OR_NEWLINE = /[\t\n\r]/g;

/**
 * Allowlist URL sanitizer for link hrefs: `http:`, `https:`, `mailto:`, `tel:`
 * and scheme-less (relative/protocol-relative/fragment/query) URLs pass;
 * everything else (e.g. `javascript:`, `data:`) becomes `''`.
 *
 * The input is first normalized the way the WHATWG URL parser does it (leading/trailing
 * C0 control or space stripped, tab/newline removed everywhere), so obfuscated schemes
 * such as `java\tscript:` are caught; the normalized URL is what gets returned.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.replace(C0_CONTROL_OR_SPACE_EDGES, '').replace(TAB_OR_NEWLINE, '').trim();
  if (trimmed === '') return '';
  if (SAFE_SCHEME.test(trimmed)) return trimmed;
  if (!HAS_SCHEME.test(trimmed)) return trimmed;
  return '';
}
