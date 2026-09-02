---
name: localess-richtext
description: Framework-neutral rich text model and renderer for Localess TipTap JSON content. Zero dependencies beyond the shared @localess/model types package. Use when rendering Localess RICH_TEXT fields to HTML or building a framework-specific rich text walker.
---

# @localess/richtext

Renders Localess rich text field values (TipTap/ProseMirror JSON produced by
the Localess Studio editor) without TipTap at runtime. Zero production
dependencies; safe in browsers, SSR, and edge runtimes.

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
  `@localess/client`'s `ContentRichText` (structurally compatible, no cast).
- Output is byte-identical to TipTap's `generateHTML` for the Studio's
  extension set, except link `href`s pass a protocol allowlist
  (`http:`/`https:`/`mailto:`/`tel:`/scheme-less); `javascript:`/`data:`
  hrefs become `""`.
- Never throws; malformed input renders `''`.

## Supported node set

Nodes: `doc`, `paragraph`, `heading` (1–6), `bulletList`, `orderedList`
(`start`), `listItem`, `codeBlock` (`language` → `class="language-x"` on
`<code>`), `text`. Marks: `bold` → `<strong>`, `italic` → `<em>`,
`strike` → `<s>`, `underline` → `<u>`, `code` → `<code>`, `link` → `<a>`.

Unknown types are skipped with a dev-only warning unless a custom renderer is
provided for that type string.

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

## Building a native walker

The helpers encode the algorithms once so walkers are mechanical translations:
`normalizeInput(input, { withKeys: true })` (keyed node list),
`buildMarkTree(textRun)` (adjacent-mark merging), `processAttrs(type, attrs,
{ attrMap })` (attribute normalization; React passes `{ class: 'className' }`),
`NODE_RENDER_MAP` / `MARK_RENDER_MAP` / `resolveHeadingTag` (default table).
See `@localess/react`'s `src/core/richtext.ts` for the reference walker.

## Test fixtures

```ts
import { richTextFixtures } from '@localess/richtext/test-utils';
```

`{ title, input, expected, parity }` corpus asserted by every Localess
renderer. `parity: true` fixtures are additionally byte-compared to TipTap's
`generateHTML` — parity is normative; never weaken an assertion to
`toContain`.
