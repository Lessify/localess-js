# Contributing to @localess/schema

Programmatic Localess schema definitions with pure type inference. **Zero
dependencies beyond `@localess/model`** — `package.json`'s only
`dependencies` entry is `@localess/model`, itself zero-dependency (ADR 007,
extended by ADR 008 and ADR 009).

## Module map

| File | Responsibility |
|---|---|
| `src/models.ts` | `export * from '@localess/model'` — re-export point for the wire model (`SchemaType`, `SchemaFieldKind`, the 18-member `SchemaField` union, `SchemaExport`), which now lives in `@localess/model` (ADR 009), not this package |
| `src/define.ts` | `defineEnum`, `defineSchema`, `defineField`, `defineConfig` — near-identity functions; `defineSchema` performs the by-value ref normalization. Also the authoring types `EnumDefinition`, `ComponentDefinition`, `SchemaDefinition`, `LocalessSchemaConfig`, `SchemaFieldInput`, `EnumDefinitionInput`, `ComponentDefinitionInput` |
| `src/infer.ts` | `InferContentData`, `InferContent`, `InferEnum` — the type-level content inference machinery |
| `src/validate.ts` | `validate()` — non-throwing authoring-rule checks (patterns, reserved names, length limits, reference resolution) |
| `src/export.ts` | `toSchemaExport()` — pure mapping from a config to the `SchemaExport[]` wire format |

`src/index.ts` is the only barrel; every other file has one responsibility.

## The zero-dependency rule

Never add an entry to `dependencies` beyond `@localess/model` in
`packages/schema/package.json`. If a compelling external library is ever
needed, raise it for discussion first — the bar is high (ADR 002).
`devDependencies` are fine. This package must never import from
`@localess/client` or `@localess/cli` in `src/`. Content value types
(`ContentAsset`, `ContentLink`, `ContentReference`, `ContentRichText`) come
from `@localess/model`, a separate zero-dependency package — importing from
it is expected and not a boundary violation.

## Wire format fidelity

Every string literal in `@localess/model`'s `src/schema.ts` (`SchemaType`,
`SchemaFieldKind`, `AssetFileType`) must match the Localess backend's enum
values exactly (`functions/src/models/schema.model.ts` in the Localess repo)
— `defineSchema` output is meant to be near-identical to the backend's
`SchemaExport`, modulo by-value refs. Don't rename or reshape these without
checking the backend contract and `docs/decisions/008-schema-package.md`.

## Adding a field kind

1. Add the interface to `@localess/model`'s `src/schema.ts` (extend
   `SchemaFieldBase`, add to the `SchemaField` union and `SchemaFieldKind`
   literal union) — see `packages/model/CONTRIBUTING.md`. This package's own
   `src/models.ts` only re-exports `@localess/model`; it defines nothing.
2. If the field has a by-value-ref-capable property (like `source` or
   `schemas`), extend `FieldInputOf` (authoring input) and `NormalizeField`
   (result type) in `src/define.ts`, and the runtime normalization loop in
   `defineSchema`. `defineField` needs no change — it derives its per-kind
   shape from `SchemaFieldInput` via `Extract<..., { kind: TKind }>`.
3. Add the `FieldValue` branch in `src/infer.ts` mapping the kind to its
   inferred TS type.
4. Add any kind-specific rule to `src/validate.ts` if the kind has
   authoring constraints beyond the base ones (give it a `code` in the
   existing `schema/`, `enum/`, `field/` namespaces and list it in the
   `validate()` tables in `SKILL.md` and `docs/schema.md`).
5. Add cases to the type tests (`models.test-d.ts`, `define.test-d.ts`,
   `define-field.test-d.ts`, `infer.test-d.ts`) and runtime tests
   (`define.test.ts`, `define-field.test.ts`, `validate.test.ts`,
   `export.test.ts`).
6. Update the field-kind table in `SKILL.md` and `docs/schema.md`, and the
   per-kind table in `packages/model/SKILL.md` / `docs/model.md`.
7. Update the CLI's `type generate` mapping
   (`packages/cli/src/commands/type/generate/generator.ts`) so both
   type-generation paths agree, and the CLI's pull emitter
   (`packages/cli/src/commands/schema/pull/emitter.ts`) so pulled definitions
   round-trip.

## Type-level testing

Type correctness is enforced with vitest's `typecheck` mode
(`vitest.config.mts` sets `typecheck.enabled: true`, scanning
`src/**/*.test-d.ts`). Use `expectTypeOf` and `// @ts-expect-error` — these
files are TypeScript-as-testrunner, not just documentation. Keep them
alongside the corresponding runtime `*.test.ts` file for the same module.

## Known excess-property-check limitation and `defineField`

A bare field literal inside `defineSchema`'s `fields` array does not flag a
stray property from the wrong field kind (e.g. `maxLength` on a `NUMBER`
field) — a fundamental TypeScript limitation on object literals inside a
`const`-inferred generic array parameter (see the "Known limitation" section
in `SKILL.md` and ADR 008). Missing required properties are still caught.

`defineField` (`src/define.ts`) is the opt-in mitigation: it infers `kind`
first, narrows the 18-member union to one member via
`Extract<SchemaFieldInput, { kind: TKind }>`, then constrains a *separate*
`const` generic for the remaining properties against that single shape —
strict excess-property checking against one member, while `name`/`kind`/
`source`/`schemas` keep their literal types (which `infer.ts` depends on).
Runtime it is an identity function; by-value ref normalization stays in
`defineSchema` only, so a field behaves the same whether or not it was
wrapped. Keep these invariants when touching it:

- `defineSchema` must keep accepting raw literals and `defineField(...)`
  results interchangeably in the same `fields` array — the wrapper is
  optional, never required (`define-field.test.ts`,
  `define-field.test-d.ts` pin both behaviors).
- Don't move normalization into `defineField`; the CLI's pull emitter emits
  `defineField(...)` calls with by-value refs and relies on `defineSchema`
  normalizing them.
- Any change to `SchemaFieldInput` flows into `defineField` automatically;
  re-run the type tests rather than hand-editing its generics.
