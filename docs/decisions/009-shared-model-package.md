# ADR 009 — Shared `@localess/model` package

**Status:** Accepted (2026-09-02).

## Decision

The 14 data-model interfaces previously living in `packages/client/src/models/*.ts`
move into a new root package, `@localess/model`, with **zero production
dependencies**, plus a new `Space` model (previously only defined, with a
boundary violation, inside `@localess/cli`). `@localess/client` becomes a
dependent of `@localess/model` rather than a root. `@localess/richtext` and
`@localess/schema` also gain a dependency on `@localess/model`, in exchange
for deleting their own structural duplicates of the same shapes
(`ContentRichTextLike` and `content-types.ts` respectively).

This is the fourth package added to the client/richtext/schema family,
triggering ADR 005's "no fourth shared package is created without explicit
discussion" rule — this ADR is that discussion.

Root tier after this change: `@localess/model`, `@localess/richtext`,
`@localess/schema` — three packages depending on nothing outside that tier
(`@localess/model` on nothing at all; `@localess/richtext` and
`@localess/schema` on `@localess/model` alone).
`@localess/client` moves to the dependent tier, depending on
`@localess/model` alone. Framework packages (`react`, `vue`, `svelte`,
`angular`, `astro`) and `@localess/cli` depend on `@localess/model` directly
for the types that moved, rather than transitively through
`@localess/client`.

## Why

Two confirmed structural duplicates existed because `@localess/richtext` and
`@localess/schema` are deliberately root packages that cannot depend on
`@localess/client` (ADR 007, ADR 008):

- `@localess/schema/src/content-types.ts` was an exact structural copy of
  `ContentAsset`/`ContentLink`/`ContentReference`/`ContentRichText`,
  guarded only by a parity type test keeping the two copies in sync.
- `@localess/richtext/src/model.ts`'s `ContentRichTextLike` was a smaller
  structural copy of `ContentRichText`.

Both were symptoms of the same root cause: no package existed that
`@localess/client`, `@localess/richtext`, and `@localess/schema` could all
depend on without reintroducing a dependency on the client SDK itself
(which carries a secret-bearing API token and an I/O surface — the actual
thing ADR 007 and ADR 008 were protecting against, not "any dependency
whatsoever"). `@localess/model` resolves this: it is itself zero-dependency,
so depending on it preserves ADR 007/008's real intent while eliminating
the duplication.

## Consequences

- `@localess/client`, `@localess/richtext`, and `@localess/schema` are no
  longer zero-*internal*-dependency (each now depends on `@localess/model`),
  though all three remain zero-*external*-dependency — no npm package outside
  this monorepo. Only `@localess/model` itself has zero dependencies of any
  kind (no `dependencies` key at all). CLAUDE.md's zero-production-dependency
  rule (ADR 002) is updated to track this distinction.
- `@localess/richtext`'s public API loses `ContentRichTextLike` and gains
  `ContentRichText` (re-exported from `@localess/model`) in its place — a
  rename, consistent with this repo's pre-1.0 clean-break migration
  philosophy (see ADR 007's own "Migration" section for precedent).
- `@localess/schema`'s public API loses `SchemaContentAsset`/
  `SchemaContentLink`/`SchemaContentReference`/`SchemaContentRichText` and
  gains the canonical `ContentAsset`/`ContentLink`/`ContentReference`/
  `ContentRichText` (re-exported from `@localess/model`) in their place —
  same rationale; nothing outside this repo depended on the prefixed names
  yet.
- The CLI's documented boundary gap (`src/models/space.ts` importing
  `Locale` from `@localess/client` directly) is resolved as a side effect —
  `Space` now lives in `@localess/model` alongside `Locale`.
- No runtime behavior changes anywhere. This is a type/interface relocation
  only.

## Follow-up: schema wire model moved too (2026-09-03)

In a follow-up to the original change, the schema wire model previously
declared in `packages/schema/src/models.ts` — `SchemaType`,
`SchemaFieldKind`, `AssetFileType`, `SchemaEnumValue`, `SchemaFieldBase`,
the 18 per-kind `SchemaField*` interfaces, `SchemaField`,
`SchemaComponentExport`, `SchemaEnumExport`, `SchemaExport` — moved to
`packages/model/src/schema.ts` and is exported from `@localess/model`.
`packages/schema/src/models.ts` became `export * from '@localess/model'`,
and `@localess/schema`'s public API keeps re-exporting all of those names,
so nothing changed for its consumers. The motivation is the same as above:
`@localess/cli` consumes `SchemaExport` for its `schema pull`/`push`/`diff`
HTTP payloads, and a wire shape used by more than one package belongs in the
shared model package rather than in the authoring package.

## Future models

`@localess/model` is meant to be where the *next* shared model goes, not
just the ones moved in this change — see `packages/model/CONTRIBUTING.md`
for how to add one.
