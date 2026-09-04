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

Exported model types: `LocalessRichTextDocument`, `LocalessRichTextNode`,
`LocalessRichTextNodeWithKey` (node plus the optional `_key` that
`normalizeInput(…, { withKeys: true })` injects), `LocalessRichTextMark`,
`LocalessRichTextLinkAttrs` (`href`, `target?`, `rel?`, `class?`),
`LocalessRichTextElement` (union of all node/mark type names plus `'doc'`), and
`LocalessRichTextInput` — the permissive input union (`doc` | node | node array
| `ContentRichText` | `null` | `undefined`) that also accepts `ContentRichText`
(re-exported from `@localess/model`), so field values pass without casting.

Renderer types: `LocalessRichTextRenderer<TOut>`,
`LocalessRichTextRenderers<TOut>` (type name → renderer, unknown names
allowed), `LocalessRichTextRendererProps<TOut>` (`type`, `attrs?`, `text?`,
`marks?`, `content?`, `children`, `context`, `_key?`), and
`LocalessRichTextHtmlOptions`. Helper option/shape types:
`NormalizeInputOptions`, `ProcessAttrsOptions`, `RichTextRenderSpec`,
`MarkTreeSegment` / `MarkTreeText` / `MarkTreeMark`.

Rendering details that match TipTap: an invalid `heading.level` falls back to
`<h1>`; `orderedList` emits `start` only when present and not `1`; `codeBlock`
renders `<pre><code class="language-x">`; `link` attrs are emitted in the order
`target`, `rel`, `href`, `class`, dropping `null`/empty values.

Unknown node types are **skipped** (unknown marks: their children are still
emitted, unwrapped) with a `console.warn` once per type per render — suppressed
when `process.env.NODE_ENV === 'production'` — unless you provide a custom
renderer for that type string — the forward-compat seam for future node types.

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

The renderer never throws — `null`, `undefined`, or malformed input renders
`''`. Text content is escaped `& < >`; attribute values `& " < >`.

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
  infinite recursion. (For mark renderers the map is passed through unchanged,
  since marks never contain themselves.)
- A custom `text` renderer receives the HTML-escaped text as `children`, and
  adjacent-mark merging is bypassed for that render.
- Renderers keyed by unknown type strings are the hook for future node types.

## Helpers for walker authors

Framework packages that render natively (react, vue) build their walkers from
the same pure helpers, so all renderers stay semantically identical:

| Helper | Purpose |
|---|---|
| `normalizeInput(input, { withKeys? })` | doc / node / array / `ContentRichText` → `LocalessRichTextNodeWithKey[]`; never throws (malformed → `[]`); opt-in recursive `_key` injection (`paragraph-1`, `text-3`, …) for keyed renderers |
| `buildMarkTree(textNodes)` | merges adjacent text nodes sharing outer marks into one `MarkTreeSegment[]` wrapper tree (ProseMirror-serializer semantics: one `<a>` per link span) |
| `marksEqual(a, b)` | deep mark equality (type + attrs) used by `buildMarkTree` |
| `processAttrs(type, attrs, { attrMap? })` | single attribute-normalization point (link sanitization + TipTap emission order); `attrMap: { class: 'className' }` for React |
| `NODE_RENDER_MAP` / `MARK_RENDER_MAP` / `resolveHeadingTag` | the declarative default render table (`RichTextRenderSpec` entries; `null` = transparent, missing key = unknown type) |
| `escapeHtml` / `escapeAttr` / `sanitizeUrl` | escaping and URL policy |

## Test fixtures (`@localess/richtext/test-utils`)

`richTextFixtures: RichTextFixture[]` is the shared correctness corpus
(`{ title, input, expected, parity }`). Every framework package asserts its
renderer against every fixture, and the core additionally asserts
`parity: true` fixtures byte-identical to TipTap's `generateHTML`.
It is a separate build entry (`dist/test-utils/`) so the fixtures never ship
inside the main bundle.
**Parity is normative:** never weaken a fixture to `toContain` — if output
formatting must change, change it to match `generateHTML` everywhere.

## Per-framework usage

### React (`@localess/react`)

Each framework package imports `@localess/richtext` only from its designated
file(s) (react `src/core/richtext.ts`, vue `src/richtext.ts`, svelte
`src/lib/components/LocalessRichText.svelte`, astro `src/richtext.ts`, angular
`src/pipes/rich-text.pipe.ts` + `src/components/localess-rich-text.component.ts`)
and re-exports the model types through its own models barrel.

### React (`@localess/react`)

Native ReactNode walker (`src/core/richtext.ts`). Overrides
(`LocalessReactRichTextRenderers`) are React components; a custom `link` can
return your router's `<Link>`.

```tsx
import { LocalessRichText, renderRichText } from '@localess/react';

<LocalessRichText content={data.body} renderers={{ link: AppLink }} />
<article>{renderRichText(data.body, { renderers: { link: AppLink } })}</article>
```

### Vue (`@localess/vue`)

Native VNode walker (`src/richtext.ts`). Override components
(`LocalessVueRichTextRenderers`) receive children as the default slot (declare
your props or set `inheritAttrs: false` to avoid attribute fallthrough).
`renderRichText` (VNodes) and `renderRichTextToHtml` (string) are both exported.

```vue
<LocalessRichText :content="data.body" />
```

```ts
import { useLocalessRichText, useLocalessRichTextHtml } from '@localess/vue';
const nodes = useLocalessRichText(() => props.data.body); // ComputedRef<VNodeChild>
const html = useLocalessRichTextHtml(() => props.data.body); // ComputedRef<string>, for v-html
```

### Svelte (`@localess/svelte`)

`$derived`-reactive component over the HTML renderer; props `content` and
`renderers?: LocalessRichTextRenderers<string>` (string-based overrides),
output via `{@html}`.

```svelte
<LocalessRichText content={data.body} />
```

### Astro (`@localess/astro`)

Component (props `content`, `renderers?: LocalessRichTextRenderers<string>`)
imported from its own subpath, rendered through `<Fragment set:html>`:

```astro
---
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
---
<LocalessRichText content={data.body} />
```

`renderRichTextToHtml` and its alias `renderLocalessRichTextToHtml` are
exported from `@localess/astro` for standalone imports.

### Angular (`@localess/angular`)

`LocalessRichText` component (`ll-rich-text`, inputs `content` and
`renderers`) and the synchronous `LocalessRichTextPipe` (`llRichText`) — both
return sanitizer-trusted HTML that the package generates and escapes itself:

```html
<ll-rich-text [content]="data.body" />
<div [innerHTML]="data.body | llRichText"></div>
```
