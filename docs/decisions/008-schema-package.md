# ADR 008 — `@localess/schema` package and code-first schema sync

**Status:** Accepted (2026-09-01).

## Decision

Schema authoring moves into a new root package, `@localess/schema`, with
**zero production dependencies** — the third root alongside `@localess/client`
and `@localess/richtext` (ADR 007). It defines, validates, infers, and
exports schema definitions; it has no HTTP client and no knowledge of the
CLI. `@localess/cli` gains a dependency on it — the first `dependent → root`
edge added since ADR 005 fixed the dependency graph, and the first exception
to ADR 005 rule 4 ("no fourth shared package without explicit discussion" —
this discussion is that exception, and it doesn't add a fourth *shared*
package: `@localess/schema` is consumed only by `@localess/cli`, not by any
framework package).

*Update (ADR 009, 2026-09-02):* the root tier is now `@localess/model`,
`@localess/richtext`, `@localess/schema`; `@localess/client` moved to the
dependent tier, and `@localess/schema` gained `@localess/model` as its single
(internal, dependency-free) dependency — still zero *external* dependencies.

The package exports `defineEnum`/`defineSchema`/`defineConfig` (near-identity
functions preserving literal types via `const` generics), the optional
per-field `defineField` (added 2026-09-04, see below), a non-throwing
`validate()`, a pure `toSchemaExport()` mapper, and the `InferContentData`/
`InferContent`/`InferEnum` type-inference family — no codegen step for
content types derived from code-first definitions.

`@localess/cli` gains `schema pull|push|diff|validate` commands that
sync definitions bidirectionally with a Localess space, described in the
implementation plan `docs/superpowers/plans/2026-09-01-cli-schema-commands.md`
(a working document that was not checked into the repo).

## Why a thin, HTTP-free package (not a fat one)

Two prior-art SDKs were studied before this design: Storyblok's
`@storyblok/schema` and Sanity's `defineType` family (full comparison in
`docs/superpowers/specs/2026-09-01-schema-package-design.md`, a working
document not checked into the repo). Both put
diffing/wire-mapping/push logic in the CLI and keep the definition package
thin; this repo follows the same layering. `@localess/schema` never imports
`@localess/client` or `@localess/cli` at runtime — CLAUDE.md rule 7's
internal-reference-only-imports discipline applies here too, funneled through
`packages/cli/src/commands/schema/schema-lib.ts`.

## Why the DSL mirrors the wire format almost 1:1

Unlike Storyblok (whose `fields` is an ordered array requiring a whole
DSL→wire mapping layer in the CLI) and Sanity (whose nested array fields lose
type safety unless each is wrapped in `defineField`), the Localess field
model is already a flat object discriminated by `kind` (`{ name, kind, ... }`).
`defineSchema`'s field objects are therefore near-identical to the backend's
`SchemaExport` — same field-kind literal strings (`'TEXT'`, `'NUMBER'`, …),
same per-kind extra properties — so pull/push round-trips are close to
lossless and there is no DSL→wire mapping table to keep in sync. The one
transformation `defineSchema` performs is normalizing by-value references
(`source`, `schemas`) to string ids.

## Why pure type inference, not codegen, for the code-first path

`InferContentData<typeof config>` computes content types directly from the
`defineConfig` result via conditional/mapped types — no build step, no
generated file to go stale. This is the Storyblok `@storyblok/schema` model
(and explicitly not Sanity's, whose `defineType` never infers document shapes
— content typing requires their separate `sanity typegen` GROQ-query
pipeline, which has no Localess equivalent since content types here are
solely schema-shaped). The existing `localess type generate` codegen command
is **retained unchanged** for consumers who don't adopt code-first schemas;
both paths agree on the field-kind → TS-type mapping table.

## Structural content types instead of a client dependency

**Superseded by ADR 009 (2026-09-02).** The locally declared
`SchemaContent*` types, the `content-types.test-d.ts` parity test, and the
`@localess/client` devDependency described below were all removed;
`@localess/schema` now imports `ContentAsset`/`ContentLink`/
`ContentReference`/`ContentRichText` from `@localess/model` and re-exports
them under those canonical names. The schema wire model itself
(`SchemaField`, `SchemaExport`, …) also moved to `packages/model/src/schema.ts`
in a follow-up; `packages/schema/src/models.ts` is now just
`export * from '@localess/model'`. The original rationale is kept for history:

`SchemaContentAsset`/`SchemaContentLink`/`SchemaContentReference`/
`SchemaContentRichText` are declared locally in `@localess/schema`, with the
same shape as `@localess/client`'s `ContentAsset`/`ContentLink`/
`ContentReference`/`ContentRichText`. This is the exact ADR 007 pattern
(structural compatibility instead of a dependency edge). A type test
(`content-types.test-d.ts`) asserts mutual assignability against the real
client types; `@localess/client` is a `devDependency` for that test only and
never ships in `dist/`.

## Known TypeScript limitation: field-kind excess properties (mitigated by `defineField`)

A bare field literal inside `defineSchema`'s `fields` array does not reject a
stray property from the wrong field kind (e.g. `maxLength` on a `NUMBER`
field) at the call site. This is a fundamental TypeScript limitation, not a
bug: excess-property ("object literal freshness") checks don't apply to
object literals inside an array passed through a `const`-inferred generic
parameter — only to literals checked directly against a declared type.
Missing required properties (e.g. omitting `source` on `OPTION`) are still
caught either way, since that is ordinary structural assignability, not a
freshness check.

`defineField` (added 2026-09) closes this gap for fields that opt in to it,
using a technique verified against both this package's own types and
Sanity's current `defineField` implementation (reworked by their commit
`38002e4432`, Aug 2026 — after this ADR's original "every alternative broke
literal preservation" finding was written): infer the field's `kind` first,
narrowing the 18-member field union down to one concrete member via
`Extract<SchemaFieldInput, { kind: TKind }>`, then constrain a *separate*
`const` generic for the remaining properties against that single narrowed
shape. Because TypeScript's excess-property check against a union target is
lenient (a property is only "excess" if it belongs to none of the union's
members) but strict against a single member, this catches the mistake while
still preserving literal types — including by-value refs (`source`,
`schemas`), which `InferContentData` depends on entirely. Full design and
verification: `docs/superpowers/specs/2026-09-04-schema-define-field-design.md`.

`defineField` is optional, matching Sanity's own framing — `defineSchema`
accepts raw field literals and `defineField(...)` results interchangeably in
the same `fields` array. At runtime it is an identity function; by-value ref
normalization (`source`, `schemas`) is deliberately left in `defineSchema`
alone, so a field behaves identically whether or not it was wrapped (the
CLI's `schema pull` emitter emits `defineField(...)` calls carrying by-value
refs and relies on this). Fields authored as bare literals keep the original,
unmitigated limitation. `validate()` and the Localess backend's own schema
validation don't check for this class of mistake either.

## Backend contract

Implemented in the Localess backend repo per
`docs/superpowers/plans/2026-09-01-schema-push-pull-api.md` (a working
document not checked into the repo):

- `GET /api/v1/spaces/:spaceId/schemas` changes in place to return
  `SchemaExport[]` (each item carries its own `id`, no timestamps) instead of
  `Record<schemaId, Schema>` with raw Firestore timestamps. This is a
  **breaking change** for already-published `@localess/cli` versions —
  communicated via backend release notes and the CLI changelog. The new
  CLI's `getSchemas()` normalizes both response shapes, so it works against
  either backend version; only the old-CLI-against-new-backend pairing
  breaks.
- `POST /api/v1/spaces/:spaceId/schemas` is new: synchronous, `X-API-KEY`
  header auth, gated by the existing `TokenPermission.DEV_TOOLS` — the same
  permission the translations write endpoint uses. No new token permission
  was introduced (an earlier draft of this ADR proposed a dedicated
  `SCHEMA_MANAGEMENT` permission; that was reverted as unnecessary complexity
  once it was clear `DEV_TOOLS` already covers exactly this kind of
  CLI/dev-tool write). Body `{ dryRun?, type: 'upsert' | 'sync', schemas }`;
  `sync` additionally deletes schemas absent from the payload, refusing
  (400) when a to-be-deleted schema is still referenced by a surviving
  schema's `SCHEMA`/`SCHEMAS` refs or `OPTION`/`OPTIONS` source.

## Accepted limitation: schema identity

A schema renamed in the Localess UI is copy-then-delete in Firestore — the
document id is the only identity Localess has for a schema. A push after a
UI rename is therefore indistinguishable from delete+create; a pull after a
UI rename produces a new definition file plus an orphaned old one (removed
by the next pull's stale-file sweep, since pull only manages files carrying
its generated-file marker). No stable non-id key is introduced in this
iteration. The guardrails are dry-run-first and opt-in deletion (`--delete`)
on push — the same pattern Storyblok's own `schema push` uses for the
identical problem.
