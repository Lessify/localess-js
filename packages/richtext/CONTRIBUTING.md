# Contributing to @localess/richtext

Framework-neutral rich text core. **Zero dependencies beyond `@localess/model`**
— `package.json`'s only `dependencies` entry is `@localess/model`, itself
zero-dependency (ADR 007, extended by ADR 009). TipTap appears only in
`devDependencies`, used exclusively by the parity test. `ContentRichText`
(used in `src/model.ts`'s `LocalessRichTextInput`) is re-exported from
`@localess/model`, not declared locally — see ADR 009.

## Module map

| File | Responsibility |
|---|---|
| `src/model.ts` | typed node/mark unions, input union, renderer prop types |
| `src/render-map.ts` | declarative default render table (`NODE_RENDER_MAP`, `MARK_RENDER_MAP`, `resolveHeadingTag`) |
| `src/normalize.ts` | input flattening + opt-in `_key` injection |
| `src/marks.ts` | `buildMarkTree` — adjacent-mark merging (ProseMirror serializer semantics) |
| `src/attrs.ts` | `processAttrs` — single attribute-normalization point |
| `src/escape.ts` | `escapeHtml`, `escapeAttr`, `sanitizeUrl` |
| `src/render-html.ts` | reference HTML renderer with overrides + loop prevention |
| `src/test-utils/fixtures.ts` | shared fixture corpus (subpath export `./test-utils`) |

## Parity is normative

`src/tiptap-parity.test.ts` asserts `renderRichTextToHtml` byte-identical to
TipTap's `generateHTML` (the Studio editor's exact extension list) for every
`parity: true` fixture. If a change breaks parity on formatting, change **our
output** (and the fixtures) to match `generateHTML` — never weaken the test.
The only permitted divergences are security ones (`sanitizeUrl`), recorded as
`parity: false` fixtures.

Escaping floor (security invariant, never relax): text escapes `& < >`;
attribute values escape `& " < >`.

## Adding a node or mark type

1. Extend the union in `src/model.ts`.
2. Add the render spec to `src/render-map.ts` (attrs attach to the element
   carrying `content: true`).
3. Add attr handling to `src/attrs.ts` if the type has attributes.
4. Add fixtures (`parity: true`) to `src/test-utils/fixtures.ts` — they
   automatically run against the core, the parity test, and every framework
   package's renderer.
5. Update the native walkers: `packages/react/src/core/richtext.ts` and
   `packages/vue/src/richtext.ts` (usually no change — they read the render
   map — but verify with the framework fixture tests).
6. Update `SKILL.md` here and the framework docs (`docs/richtext.md`).

If the node set grows past ~15 types, revisit ADR 007's note about switching
to TipTap-schema codegen for the render map.

## Consumers' import boundary

Framework packages import this package only from designated files (see each
package's CONTRIBUTING.md): react `src/core/richtext.ts`, vue
`src/richtext.ts`, svelte `src/lib/components/LocalessRichText.svelte`, astro
`src/richtext.ts`, angular `src/pipes/rich-text.pipe.ts` +
`src/components/localess-rich-text.component.ts`; model types re-export
through each package's models barrel.
