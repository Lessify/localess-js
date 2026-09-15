<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/richtext

The framework-neutral rich text layer for [Localess](https://github.com/Lessify/localess): a precise node/mark model for the JSON the Localess Studio editor produces, an HTML renderer, and HTML/Markdown parsers that turn existing content back into that model.

Every framework package (`@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro`) renders rich text through this package and ships its own `<LocalessRichText>` component on top of it. Use `@localess/richtext` directly when you need HTML on the server, are integrating a framework we don't ship, or are importing content from elsewhere.

**No TipTap at runtime.** The editor's JSON format is modelled here as plain types; TipTap appears only as a `devDependency`, used by a parity test that proves this renderer agrees with the editor. Your bundle never sees it.

**Zero external dependencies** — `@localess/model` is the only entry in `dependencies`. See [ADR 007](../../docs/decisions/007-shared-richtext-package.md).

## Requirements

- Node.js >= 24.0.0

## Installation

```bash
# npm
npm install @localess/richtext

# yarn
yarn add @localess/richtext

# pnpm
pnpm add @localess/richtext
```

---

## Rendering to HTML

```ts
import { renderRichTextToHtml } from '@localess/richtext';

const html = renderRichTextToHtml(content.data.content);
```

`renderRichTextToHtml(input, options?)` accepts a whole document, a single node, an array of nodes, or the loose `ContentRichText` from `@localess/model` — and returns `''` for `null`/`undefined`, so you don't need to guard an empty field.

**Supported:** headings (h1–h6), paragraphs, bold, italic, strikethrough, underline, code, code blocks, ordered and unordered lists, and links. Link `href`s pass a protocol allowlist — `javascript:` and `data:` are stripped. Unknown node types are skipped rather than throwing.

### Overriding a node type

Pass `renderers` to replace how one type is rendered — node types and mark types alike. A renderer receives the node's own `attrs`, `text` and `marks` plus its already-rendered `children`, so you only describe the wrapper:

```ts
const html = renderRichTextToHtml(content.data.content, {
  renderers: {
    heading: ({ attrs, children }) => `<h${attrs?.level} class="font-bold">${children}</h${attrs?.level}>`,
    link: ({ attrs, children }) => `<a href="${attrs?.href}" rel="noopener">${children}</a>`,
  },
});
```

---

## The document model

`LocalessRichTextDocument` is the exact shape the Studio editor emits. Typing a field with it — rather than `@localess/model`'s deliberately loose `ContentRichText` — gives you real autocomplete over nodes and marks. From the [schema playground](../../playgrounds/schema):

```ts
import type { LocalessRichTextDocument } from '@localess/richtext';

const doc: LocalessRichTextDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'paragraph' }] },
    { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Bold' }] },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
      ],
    },
    { type: 'codeBlock', content: [{ type: 'text', text: 'This is Code Block' }] },
  ],
};
```

| Type | Purpose |
|---|---|
| `LocalessRichTextDocument` | A whole document — `{ type: 'doc'; content: [...] }` |
| `LocalessRichTextNode` | The node union: heading, paragraph, text, lists, code block, … |
| `LocalessRichTextMark` | The mark union: bold, italic, strike, underline, code, link |
| `LocalessRichTextInput` | What the renderer accepts — document, node, node array, `ContentRichText`, `null` or `undefined` |
| `LocalessRichTextRenderers<TOut>` | The `renderers` override map, generic over the output type |

`LocalessRichTextRenderers<TOut>` is generic because the framework packages reuse it: React renders to `ReactNode`, Vue to `VNode`, this package to `string`.

---

## Importing existing content

Two parsers convert into the model, each behind its own subpath so you only pay for the one you use:

```ts
import { parseHtmlToRichText } from '@localess/richtext/html-parser';
import { parseMarkdownToRichText } from '@localess/richtext/markdown-parser';

const { doc } = parseHtmlToRichText('<h1>Title</h1><p>Body</p>');
const { doc: fromMarkdown } = parseMarkdownToRichText('# Title\n\nBody');
```

Both return `{ doc, unsupported }`. The model is closed — it matches the Studio editor exactly — so a construct with nowhere to go, like a `<table>` or a blockquote, is **reported** rather than silently lost:

```ts
const { doc, unsupported } = parseHtmlToRichText(legacyHtml);
// unsupported → [{ element: 'table', action: 'unwrapped', count: 347 }]
```

The `unsupported` option chooses the handling: `'unwrap'` keeps the inner text and drops the wrapper (the default), `'skip'` drops the element and its contents, and `'throw'` raises `RichTextParseError` naming the element. Getting a counted report back rather than only a console warning is what lets a migration surface "347 tables were unwrapped" and decide whether to proceed *before* committing a write.

`@localess/richtext/test-utils` exports `richTextFixtures`, the same fixture set this package tests against, for asserting your own renderers.

---

## Related

- [`@localess/model`](../model) — where `ContentRichText` and the content types live
- [docs/richtext.md](../../docs/richtext.md) — full reference, overrides, and per-framework usage
- Framework components: [react](../react), [angular](../angular), [vue](../vue), [svelte](../svelte), [astro](../astro)

## License

See the [Localess](https://github.com/Lessify/localess) repository.
