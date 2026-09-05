---
name: localess-richtext
description: Framework-neutral rich text model and renderer for Localess TipTap JSON content. Zero dependencies beyond the shared @localess/model types package. Use when rendering Localess RICH_TEXT fields to HTML or building a framework-specific rich text walker.
---

# @localess/richtext

Renders Localess rich text field values (TipTap/ProseMirror JSON produced by
the Localess Studio editor) without TipTap at runtime. Zero external
dependencies — its only dependency is the in-monorepo, itself-zero-dependency
`@localess/model` types package; safe in browsers, SSR, and edge runtimes.
Requires Node.js >= 24.0.0 when used server-side.

```bash
npm install @localess/richtext
```

Framework packages (`@localess/react`, `@localess/vue`, `@localess/svelte`,
`@localess/astro`, `@localess/angular`) ship idiomatic wrappers — prefer those
in app code. Use this package directly for custom pipelines (emails, static
generation, other frameworks).

## Render to HTML

```ts
import { renderRichTextToHtml } from '@localess/richtext';

const html = renderRichTextToHtml(data.body);
```

- Input: `LocalessRichTextInput` — a `doc`, a node, a node array, `null`, or
  `ContentRichText` (re-exported from `@localess/model`, no cast).
- Output is byte-identical to TipTap's `generateHTML` for the Studio's
  extension set, except link `href`s pass a protocol allowlist
  (`http:`/`https:`/`mailto:`/`tel:`/scheme-less); `javascript:`/`data:`
  hrefs become `""`.
- Never throws; malformed input renders `''`.

## Supported node set

Nodes: `doc`, `paragraph` → `<p>`, `heading` (`level` 1–6 → `<h1>`…`<h6>`;
any other level falls back to `<h1>`), `bulletList` → `<ul>`, `orderedList`
→ `<ol>` (`start` emitted only when present and not `1`), `listItem` → `<li>`,
`codeBlock` → `<pre><code>` (`language` → `class="language-x"` on `<code>`),
`text`. Marks: `bold` → `<strong>`, `italic` → `<em>`, `strike` → `<s>`,
`underline` → `<u>`, `code` → `<code>`, `link` → `<a>` (`target`, `rel`,
sanitized `href`, `class`, in that order; `null`/empty attrs are dropped).

Adjacent `text` nodes sharing outer marks are merged into one wrapper
(`<strong>a<em>b</em></strong>`, one `<a>` per link span), matching
ProseMirror's serializer. Text is escaped `& < >`; attribute values `& " < >`.

Unknown node/mark types are skipped (marks: their children are still emitted)
with a `console.warn` once per type per render — suppressed when
`process.env.NODE_ENV === 'production'` — unless a custom renderer is provided
for that type string.

## Custom renderers

```ts
renderRichTextToHtml(data.body, {
  renderers: {
    heading: ({ attrs, children }) => `<h${attrs.level} class="title">${children}</h${attrs.level}>`,
  },
});
```

`children` arrives pre-rendered. `props.context.renderers` has the current
type unset — pass it to a nested `renderRichTextToHtml` call to re-render your
own node without infinite recursion.

Renderer props (`LocalessRichTextRendererProps<TOut>`): `type`, `attrs?`,
`text?`, `marks?`, `content?`, `children`, `context: { renderers? }`, `_key?`.
Options type: `LocalessRichTextHtmlOptions` (`{ renderers?:
LocalessRichTextRenderers<string> }`). A custom `text` renderer receives the
HTML-escaped text as `children` and disables adjacent-mark merging for that
render; a custom mark renderer receives `context.renderers` unchanged (marks
don't nest into themselves).

## Building a native walker

The helpers encode the algorithms once so walkers are mechanical translations:
`normalizeInput(input, { withKeys: true })` (keyed node list, `_key` =
`paragraph-1`, `text-3`, …; never throws, malformed input → `[]`),
`buildMarkTree(textRun)` → `MarkTreeSegment[]` (adjacent-mark merging;
`marksEqual(a, b)` is the comparison it uses), `processAttrs(type, attrs,
{ attrMap })` (attribute normalization; React passes `{ class: 'className' }`),
`NODE_RENDER_MAP` / `MARK_RENDER_MAP` / `resolveHeadingTag` (default table;
`null` entry = transparent, missing key = unknown), `escapeHtml` /
`escapeAttr` / `sanitizeUrl` (escaping and URL allowlist).
See `@localess/react`'s `src/core/richtext.ts` for the reference walker.

## Test fixtures

```ts
import { richTextFixtures } from '@localess/richtext/test-utils';
```

`richTextFixtures: RichTextFixture[]` — a `{ title, input, expected, parity }`
corpus asserted by every Localess renderer. `parity: true` fixtures are
additionally byte-compared to TipTap's `generateHTML` — parity is normative;
never weaken an assertion to `toContain`.

## Exports Reference

```typescript
// @localess/richtext
export { renderRichTextToHtml }                                        // HTML string renderer
export { normalizeInput, buildMarkTree, marksEqual, processAttrs }     // walker helpers
export { escapeHtml, escapeAttr, sanitizeUrl }                         // escaping / URL policy
export { NODE_RENDER_MAP, MARK_RENDER_MAP, resolveHeadingTag }         // default render table
export type {
  LocalessRichTextDocument, LocalessRichTextNode, LocalessRichTextNodeWithKey,
  LocalessRichTextMark, LocalessRichTextLinkAttrs, LocalessRichTextElement,
  LocalessRichTextInput, ContentRichText /* re-exported from @localess/model */,
  LocalessRichTextRenderer, LocalessRichTextRenderers, LocalessRichTextRendererProps,
  LocalessRichTextHtmlOptions, NormalizeInputOptions, ProcessAttrsOptions,
  RichTextRenderSpec, MarkTreeSegment, MarkTreeText, MarkTreeMark,
}

// @localess/richtext/test-utils
export { richTextFixtures }
export type { RichTextFixture }
```

## Parsing (`@localess/richtext/html-parser`, `/markdown-parser`)

```ts
import { parseHtmlToRichText } from '@localess/richtext/html-parser';
import { parseMarkdownToRichText } from '@localess/richtext/markdown-parser';

parseHtmlToRichText(html: string | null | undefined, options?: RichTextParseOptions): RichTextParseResult
parseMarkdownToRichText(markdown: string | null | undefined, options?: RichTextParseOptions): RichTextParseResult
```

```ts
interface RichTextParseOptions { unsupported?: 'unwrap' | 'skip' | 'throw' }  // default 'unwrap'
interface RichTextParseResult {
  doc: LocalessRichTextDocument;
  unsupported: { element: string; action: 'unwrapped' | 'skipped'; count: number }[];
}
class RichTextParseError extends Error { element: string }
```

Both are **subset** parsers matched to the closed model — not HTML5-conformant, not CommonMark.
HTML covers `p`, `h1`–`h6`, `ul`, `ol` (`start`), `li`, `pre`/`code` (`language-*`) and the marks
`strong`/`b`, `em`/`i`, `s`/`strike`/`del`, `u`, `code`, `a`; `div`/`span` are transparent and
`script`/`style` are always dropped. Markdown covers ATX and setext headings, paragraphs, bullet and
ordered lists (nested, `start`), fenced and indented code blocks, `**bold**`, `*italic*`,
`~~strike~~`, `` `code` ``, `[text](href)` and backslash escapes.

Anything else goes through `unsupported` and is listed in the result — return the report to the
caller, do not assume a clean parse. One warning per element type per parse, silent in production.

Link hrefs pass the renderer's `sanitizeUrl` allowlist: `javascript:` and `data:` become `""`.

Never throws except under `unsupported: 'throw'`; `null`, `undefined`, and `''` give an empty doc.

`parseHtmlToRichText` is the exact inverse of `renderRichTextToHtml` over the whole supported model.
