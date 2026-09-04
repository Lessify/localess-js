# Contributing to @localess/model

Shared domain-model types. **Zero dependencies** — `package.json` has no
`dependencies` key at all, and that is load-bearing (ADR 002, ADR 009):
`@localess/client`, `@localess/richtext`, `@localess/schema`, every
framework package, and `@localess/cli` all depend on this package, so it
must never depend on any of them (or on anything else).

## Module map

One kebab-case file per model, each with a single responsibility, plus
`src/index.ts` as the only barrel (`export *` from every file). Most files
hold exactly one type named after the file; two group closely related
shapes: `src/content-data.ts` (`ContentData`, `ContentDataSchema`,
`ContentDataField`) and `src/schema.ts` (the whole schema wire model —
`SchemaType`, `SchemaFieldKind`, `AssetFileType`, `SchemaEnumValue`,
`SchemaFieldBase`, the 18 per-kind `SchemaField*` interfaces, `SchemaField`,
`SchemaComponentExport`, `SchemaEnumExport`, `SchemaExport`). See
`docs/model.md` for the full type list.

## Adding a new shared model

1. Add `src/<kebab-case-name>.ts` with the interface/type and JSDoc on every
   public field.
2. Export it from `src/index.ts`.
3. Add a construction smoke test to `src/index.test.ts` (one `it()` block
   constructing a valid value and asserting one field — these types have no
   runtime logic, so the test exists only as a regression trip-wire for the
   shape itself). The schema wire model is the exception: its narrowing is
   type-tested in `packages/schema/src/models.test-d.ts` instead.
4. Add a row to the type tables in `docs/model.md` and `SKILL.md`.
5. If the type is meant to replace a duplicate that exists elsewhere in the
   repo (the usual reason to add something here), update that package to
   import from `@localess/model` instead and delete its local copy — don't
   leave both.

## Changing the schema wire model (`src/schema.ts`)

Every string literal in `SchemaType`, `SchemaFieldKind`, and `AssetFileType`
must match the Localess backend's enum values exactly — definitions
round-trip through `@localess/cli`'s `schema pull`/`push` without any
mapping layer. Adding a field kind is a cross-package change (new interface
here, then inference/validation/normalization in `@localess/schema` and the
CLI's type generator and pull emitter); follow the "Adding a field kind"
checklist in `packages/schema/CONTRIBUTING.md`.

## What does NOT belong here

- Anything with runtime behavior (classes, functions) — this package is
  types only. `LocalessApiError`, for example, stays in `@localess/client`.
- Types specific to one package's internal implementation (e.g. CLI command
  option types, framework component prop types) — only genuinely
  cross-package wire/domain shapes belong here.
