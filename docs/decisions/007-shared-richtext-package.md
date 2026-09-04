# ADR 007 — Shared `@localess/richtext` package

**Status:** Accepted (2026-08-31). Supersedes the "Simpler rich text / fixed
extension set, no per-node customization" position in ADR 006.

**Amended by [ADR 009](009-shared-model-package.md) (2026-09-02):**
`@localess/richtext` now has exactly one dependency, the itself-zero-dependency
`@localess/model` package, and re-exports its `ContentRichText` type instead of
declaring a structural copy (`ContentRichTextLike` was removed). The root tier
is now `@localess/model`, `@localess/richtext`, `@localess/schema` (ADR 008),
and `@localess/cli` depends on `@localess/client`, `@localess/model`, and
`@localess/schema`. The text below is preserved as written at the time.

## Decision

Rich text rendering moves into a new root package, `@localess/richtext`, with
**zero dependencies** — not even `@localess/client` (its input type accepts
client's `ContentRichText` structurally). The dependency graph gains a second
root: framework packages (`react`, `vue`, `svelte`, `astro`, `angular`) depend
on both `@localess/client` and `@localess/richtext`; `@localess/cli` depends on
client only; the two roots never depend on each other or anything else.

The package exports a typed node model (exactly the node/mark set the Localess
Studio TipTap editor can produce), a hand-written declarative render map, pure
helpers (input normalization, adjacent-mark merging, attribute normalization,
HTML escaping, URL protocol-allowlist sanitization), a reference HTML-string
renderer with a full per-type override map (loop-prevention contract: a custom
renderer receives pre-rendered `children` and a `context.renderers` with its
own type unset), and a fixture corpus shipped as `@localess/richtext/test-utils`.

React and Vue render natively (ReactNode / VNode walkers built from the same
helpers); Svelte, Astro, and Angular render through the HTML renderer.
TipTap is a devDependency only, used by a parity test asserting byte-identical
output to `generateHTML` with the CMS's exact extension list.

## Why

- TipTap (+ ProseMirror) was a runtime dependency in five packages purely to
  serialize JSON to HTML; the CMS's node set is 8 nodes and 6 marks.
- Five near-duplicate renderers with three engines and incompatible APIs
  (`ReactNode` / `string` / `ComputedRef` / one-shot `Readable` / `Promise`).
- No customization: consumers could not swap `<a>` for a router link (ADR 006's
  fixed-set stance, now superseded).
- The shared fixture corpus makes cross-framework output identity a tested
  property instead of a convention.

## Why hand-written render map (not codegen)

With 8 node types and 6 marks, a 40-line table is clearer than build-time
TipTap-schema codegen. The parity test guards drift against the CMS. If the
node set grows past ~15, adopt Storyblok-style `toDOM()`-flattening codegen.

## Deliberate differences from TipTap output

`sanitizeUrl` strips non-allowlisted URL schemes (`javascript:`, `data:`, …)
from link hrefs — TipTap escapes but keeps them. Fixtures marked
`parity: false` document every intentional divergence.

## Forward compatibility

Unknown node/mark types are skipped with a dev-only warning unless a custom
renderer for that type string is provided. A future CMS "embedded schema"
node plugs in as a resolver per framework — no core change required.

## Migration (clean break, pre-1.0)

Removed: `renderRichTextToReact` (react), `localessRichText` store (svelte),
`llRtToHtml` / `RichTextToHtmlPipe` (angular). Re-implemented, signature
changed: `useLocalessRichText` (vue, now returns VNodes;
`useLocalessRichTextHtml` covers the string case). Kept as alias:
`renderLocalessRichTextToHtml` (astro). New everywhere: `LocalessRichText`
component and per-framework `renderRichText` / `renderRichTextToHtml`.
