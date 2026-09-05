/** A token produced by {@link tokenizeHtml}. */
export type HtmlToken =
  | { kind: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; name: string }
  | { kind: 'text'; text: string };

/** Elements that never have a closing tag. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Elements whose content is raw text, not markup. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Decodes the named and numeric character references the renderer can emit,
 * plus the few that appear in hand-written HTML. Unknown references are left
 * verbatim rather than dropped, so no text is silently lost.
 */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const codePoint = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (!(name in attrs)) attrs[name] = decodeEntities(value);
  }
  return attrs;
}

/**
 * Tokenizes HTML into a flat token stream.
 *
 * A deliberate **subset** tokenizer, not an HTML5-conformant one: it handles
 * the tags the Localess model can represent, treats everything else as a
 * generic element for the caller's unsupported policy, and performs no error
 * recovery beyond never throwing. Chosen over branching on `DOMParser` so the
 * result is identical in browsers, Node, and edge runtimes, and so the package
 * keeps its zero-dependency guarantee.
 *
 * A stray `<` that does not begin a valid tag is emitted as text.
 */
export function tokenizeHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let index = 0;
  let pendingText = '';

  const flushText = () => {
    if (pendingText === '') return;
    tokens.push({ kind: 'text', text: decodeEntities(pendingText) });
    pendingText = '';
  };

  while (index < html.length) {
    const next = html.indexOf('<', index);
    if (next === -1) {
      pendingText += html.slice(index);
      break;
    }
    pendingText += html.slice(index, next);

    const rest = html.slice(next);

    // Comments, doctypes and CDATA carry nothing the model can use.
    if (rest.startsWith('<!--')) {
      const end = html.indexOf('-->', next + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (rest.startsWith('<!') || rest.startsWith('<?')) {
      const end = html.indexOf('>', next + 1);
      index = end === -1 ? html.length : end + 1;
      continue;
    }

    const closeMatch = /^<\/\s*([a-zA-Z][^\s>]*)\s*>/.exec(rest);
    if (closeMatch) {
      flushText();
      tokens.push({ kind: 'close', name: closeMatch[1].toLowerCase() });
      index = next + closeMatch[0].length;
      continue;
    }

    const openMatch = /^<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(rest);
    if (openMatch) {
      flushText();
      const name = openMatch[1].toLowerCase();
      const raw = openMatch[2] ?? '';
      const selfClosing = /\/\s*$/.test(raw) || VOID_ELEMENTS.has(name);
      tokens.push({ kind: 'open', name, attrs: parseAttributes(raw), selfClosing });
      index = next + openMatch[0].length;

      if (RAW_TEXT_ELEMENTS.has(name) && !selfClosing) {
        const closeTag = `</${name}`;
        const end = html.toLowerCase().indexOf(closeTag, index);
        const contentEnd = end === -1 ? html.length : end;
        // Content is dropped, not emitted as text — script/style bodies are not prose.
        index = contentEnd;
      }
      continue;
    }

    // Not a tag — a literal `<`.
    pendingText += '<';
    index = next + 1;
  }

  flushText();
  return tokens;
}
