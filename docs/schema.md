# @localess/schema Reference

Programmatic schema definitions for the Localess headless CMS, with pure TypeScript type inference of content types — no codegen step.

**Zero production dependencies beyond `@localess/model`** — one of three root packages (`@localess/model`, `@localess/richtext`, `@localess/schema`) that depend on nothing else; `@localess/client` is a dependent, not a root. → [ADR 008](decisions/008-schema-package.md), [ADR 009](decisions/009-shared-model-package.md)

Defines, validates, infers, and exports schema definitions only — no HTTP client, no CLI knowledge. `@localess/cli`'s `schema pull|push|diff|validate` commands sync definitions written with this package to and from a Localess space; see [docs/cli.md](cli.md).

## Installation

```bash
npm install @localess/schema
```

## Authoring

```typescript
import { defineConfig, defineEnum, defineSchema } from "@localess/schema";
import type { InferContentData } from "@localess/schema";

const ButtonType = defineEnum({
  id: 'ButtonType',
  displayName: 'Button Type',
  values: [
    { name: 'Primary', value: 'primary' },
    { name: 'Secondary', value: 'secondary' },
  ],
});

const Button = defineSchema({
  id: 'Button',
  type: 'NODE',
  displayName: 'Button',
  previewField: 'label',
  fields: [
    { name: 'label', kind: 'TEXT', required: true, translatable: true, maxLength: 50 },
    { name: 'type', kind: 'OPTION', source: ButtonType },   // by-value ref, normalized to 'ButtonType'
    { name: 'icon', kind: 'ASSET', fileTypes: ['IMAGE'] },
  ],
});

const Page = defineSchema({
  id: 'Page',
  type: 'ROOT',
  fields: [
    { name: 'title', kind: 'TEXT', required: true },
    { name: 'blocks', kind: 'SCHEMAS', schemas: [Button] },
  ],
});

export const config = defineConfig({ schemas: [Page, Button, ButtonType] });

// { _id: string; _schema: 'Page'; title: string; blocks?: ButtonContent[] }
export type Content = InferContentData<typeof config>;
```

- `defineEnum` / `defineSchema` are near-identity functions preserving literal types via `const` generics; `defineSchema` normalizes by-value references (`source`, `schemas`) to string ids at runtime, matching the wire format exactly.
- `defineConfig` registers the full schema list — the unit `@localess/cli` loads and inference resolves against. Throws on duplicate schema/field ids (programming errors, not validation concerns).
- Wire enum values (`'ROOT' | 'NODE' | 'ENUM'`, `'TEXT' | 'NUMBER' | ...`) match the Localess backend exactly, so `defineSchema` output is near-identical to the server's `SchemaExport`.

### Optional: `defineField` for stricter per-field type-checking

A field written as a bare object literal inside `fields: [...]` can't be checked for excess properties from the wrong kind — TypeScript's excess-property check doesn't apply to object literals nested inside a `const`-inferred generic array parameter. Wrap a field in `defineField(...)` to get that check at the call site, while keeping the same literal-type preservation:

```typescript
import { defineField } from "@localess/schema";

defineField({ name: 'amount', kind: 'NUMBER', maxLength: 5 });
// ^ compile error: maxLength is not valid on a NUMBER field

defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 }); // OK
```

`defineField` is optional and purely additive — `defineSchema`'s `fields` array accepts raw literals and `defineField(...)` results interchangeably, and by-value ref normalization (`source`, `schemas`) still happens in `defineSchema` either way.

## Type Inference

| Export | Purpose |
|---|---|
| `InferContentData<C>` | Union of every `ROOT` schema's content type in config `C` |
| `InferContent<S, C>` | Content type of one schema definition `S`, resolved against config `C` |
| `InferEnum<E>` | Literal union of an enum definition's values |

`OPTION` fields resolve to the literal union of the referenced enum's values (not plain `string`); `SCHEMA`/`SCHEMAS` fields resolve to the allowed schemas' content types (or every `NODE` schema in the config when `schemas` is omitted). `required: true` fields become non-optional keys; every other field is optional.

## Field Kinds

| Kind | Extra properties | Inferred type |
|---|---|---|
| `TEXT`, `TEXTAREA`, `MARKDOWN`, `COLOR`, `DATE`, `DATETIME` | `minLength?`, `maxLength?` (text kinds only) | `string` |
| `RICH_TEXT` | `minLength?`, `maxLength?` | `ContentRichText` |
| `NUMBER` | `minValue?`, `maxValue?` | `number` |
| `BOOLEAN` | — | `boolean` |
| `OPTION` | `source` (required) | literal union of the referenced enum's values |
| `OPTIONS` | `source` (required), `minValues?`, `maxValues?` | that union, as an array |
| `LINK` | — | `ContentLink` |
| `REFERENCE` / `REFERENCES` | `path?` | `ContentReference` / `[]` |
| `ASSET` / `ASSETS` | `fileTypes?`, `fileType?` | `ContentAsset` / `[]` |
| `SCHEMA` / `SCHEMAS` | `schemas?` (allowed ids/definitions) | allowed schemas' content type(s), or `[]` |

`ContentAsset`, `ContentLink`, `ContentReference`, and `ContentRichText` are re-exported from `@localess/model`, the shared domain-model package (see ADR 009).

## `validate(config)`

Non-throwing: `{ ok: boolean, issues: ValidationIssue[] }`, where `ValidationIssue = { severity: 'error' | 'warning', code, path, message }`. `ok` is `false` only when at least one error-severity issue is present.

Checks: schema id pattern/length/reserved-name, field name pattern/length/reserved-name (camelCase, no `_i18n_`), display name/description/label length limits, ENUM value name/value pattern, and cross-references — every `OPTION`/`OPTIONS` `source` must resolve to an `ENUM` in the config, every `SCHEMA`/`SCHEMAS` ref must resolve to a `ROOT`/`NODE`, and `previewField` must name an existing field.

## `toSchemaExport(config)`

Pure mapping from a config to `SchemaExport[]` — the wire format the Localess API accepts (`POST /schemas`) and returns (`GET /schemas`). Strips `undefined`-valued optional keys; performs no I/O.

## Known Limitation

A bare field literal inside `defineSchema`'s `fields` array does not reject a stray property from the wrong field kind (e.g. `maxLength` on a `NUMBER` field) at the call site — a TypeScript limitation on object literals inside a `const`-inferred generic array parameter. Wrap the field in `defineField(...)` (see "Optional: `defineField`" above) to get that check. Missing required properties (e.g. omitting `source` on `OPTION`) are still caught either way. See [ADR 008](decisions/008-schema-package.md) for the full explanation.
