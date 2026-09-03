# `@localess/richtext` — Rich Text Model and Renderer

Framework-neutral rich text rendering for Localess's TipTap JSON content.
**Zero dependencies beyond `@localess/model`** — never `@localess/client`. Browser- and server-safe.
See `docs/decisions/007-shared-richtext-package.md` and [ADR 009](decisions/009-shared-model-package.md) for the WHY.

## The model

The typed node/mark unions match exactly what the Localess Studio editor can
produce today:

- **Nodes:** `doc`, `paragraph`, `heading` (levels 1–6), `bulletList`,
  `orderedList` (`start`), `listItem`, `codeBlock` (`language`), `text`.
- **Marks:** `bold`, `italic`, `strike`, `underline`, `code`,
  `link` (`href`, `target`, `rel`, `class`).

Exported types: `LocalessRichTextDocument`, `LocalessRichTextNode`,
`LocalessRichTextMark`, `LocalessRichTextElement`, and
`LocalessRichTextInput` — the permissive input union that also accepts
`ContentRichText` (re-exported from `@localess/model`), so field values pass
without casting.

Unknown node/mark types are **skipped** with a dev-only `console.warn`
(once per type per render) unless you provide a custom renderer for that type
string — the forward-compat seam for future node types.

## HTML renderer

```ts
import { renderRichTextToHtml } from '@localess/richtext';

const html = renderRichTextToHtml(data.body);
```

Output is byte-identical to TipTap's `generateHTML` with the CMS's extension
list (enforced by a parity test), with one deliberate exception: link `href`
values pass through `sanitizeUrl`, a protocol allowlist (`http:`, `https:`,
`mailto:`, `tel:`, and scheme-less URLs). `javascript:`/`data:` hrefs become
`""` instead of being escaped-but-kept.

## Custom renderers (overrides)

Every node and mark type can be overridden per render call:

```ts
const html = renderRichTextToHtml(data.body, {
  renderers: {
    heading: ({ attrs, children }) => `<h${attrs.level} class="title">${children}</h${attrs.level}>`,
    link: ({ attrs, children }) => `<a class="app-link" href="${attrs.href}">${children}</a>`,
  },
});
```

The contract:

- `children` is the **pre-rendered** content of the node/mark.
- `props.context.renderers` is the override map with the current type unset —
  pass it back into `renderRichTextToHtml` to re-render your own node without
  infinite recursion.
- Renderers keyed by unknown type strings are the hook for future node types.

## Helpers for walker authors

Framework packages that render natively (react, vue) build their walkers from
the same pure helpers, so all renderers stay semantically identical:

| Helper | Purpose |
|---|---|
| `normalizeInput(input, { withKeys? })` | doc / node / array / client stub → node list; opt-in recursive `_key` injection (`paragraph-1`, `text-3`, …) for keyed renderers |
| `buildMarkTree(textNodes)` | merges adjacent text nodes sharing outer marks into one wrapper tree (ProseMirror-serializer semantics: one `<a>` per link span) |
| `processAttrs(type, attrs, { attrMap? })` | single attribute-normalization point (link sanitization + TipTap emission order); `attrMap: { class: 'className' }` for React |
| `NODE_RENDER_MAP` / `MARK_RENDER_MAP` / `resolveHeadingTag` | the declarative default render table |
| `escapeHtml` / `escapeAttr` / `sanitizeUrl` | escaping and URL policy |

## Test fixtures (`@localess/richtext/test-utils`)

`richTextFixtures` is the shared correctness corpus
(`{ title, input, expected, parity }`). Every framework package asserts its
renderer against every fixture, and the core additionally asserts
`parity: true` fixtures byte-identical to TipTap's `generateHTML`.
**Parity is normative:** never weaken a fixture to `toContain` — if output
formatting must change, change it to match `generateHTML` everywhere.

## Per-framework usage

### React (`@localess/react`)

Native ReactNode walker. Overrides are React components; a custom `link` can
return your router's `<Link>`.

```tsx
import { LocalessRichText, renderRichText } from '@localess/react';

<LocalessRichText content={data.body} />
<article>{renderRichText(data.body, { renderers: { link: AppLink } })}</article>
```

### Vue (`@localess/vue`)

Native VNode walker. Override components receive children as the default slot
(declare your props or set `inheritAttrs: false` to avoid attribute
fallthrough).

```vue
<LocalessRichText :content="data.body" />
```

```ts
import { useLocalessRichText, useLocalessRichTextHtml } from '@localess/vue';
const nodes = useLocalessRichText(() => props.data.body); // ComputedRef<VNodeChild>
const html = useLocalessRichTextHtml(() => props.data.body); // ComputedRef<string>, for v-html
```

### Svelte (`@localess/svelte`)

`$derived`-reactive component over the HTML renderer (string-based overrides).

```svelte
<LocalessRichText content={data.body} />
```

### Astro (`@localess/astro`)

```astro
<LocalessRichText content={data.body} />
```

`renderLocalessRichTextToHtml` (alias of `renderRichTextToHtml`) remains for
standalone imports.

### Angular (`@localess/angular`)

Component and synchronous pipe (both return sanitizer-trusted HTML that the
package generates and escapes itself):

```html
<ll-rich-text [content]="data.body" />
<div [innerHTML]="data.body | llRichText"></div>
```
