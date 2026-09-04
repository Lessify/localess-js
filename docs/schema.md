# @localess/schema Reference

Programmatic schema definitions for the Localess headless CMS, with pure TypeScript type inference of content types — no codegen step.

**Zero external dependencies** — its only `dependencies` entry is `@localess/model`, itself dependency-free. One of three root packages (`@localess/model`, `@localess/richtext`, `@localess/schema`) that depend on nothing outside that root tier; `@localess/client` is a dependent, not a root. → [ADR 008](decisions/008-schema-package.md), [ADR 009](decisions/009-shared-model-package.md)

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

- `defineEnum` / `defineSchema` are near-identity functions preserving literal types via `const` generics; `defineEnum` injects `type: 'ENUM'`, `defineSchema` normalizes by-value references (`source`, `schemas`) to string ids at runtime, matching the wire format exactly. `defineSchema` throws on duplicate field names.
- `defineConfig` registers the full schema list — the unit `@localess/cli` loads and inference resolves against. Returns the config unchanged; throws on duplicate schema ids. (Duplicates are programming errors, not validation concerns — `validate()` doesn't report them.)
- Wire enum values (`'ROOT' | 'NODE' | 'ENUM'`, `'TEXT' | 'NUMBER' | ...`) match the Localess backend exactly, so `defineSchema` output is near-identical to the server's `SchemaExport`.

### Optional: `defineField` for stricter per-field type-checking

A field written as a bare object literal inside `fields: [...]` can't be checked for excess properties from the wrong kind — TypeScript's excess-property check doesn't apply to object literals nested inside a `const`-inferred generic array parameter. Wrap a field in `defineField(...)` to get that check at the call site, while keeping the same literal-type preservation:

```typescript
import { defineField } from "@localess/schema";

defineField({ name: 'amount', kind: 'NUMBER', maxLength: 5 });
// ^ compile error: maxLength is not valid on a NUMBER field

defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 }); // OK
```

`defineField` is optional and purely additive — `defineSchema`'s `fields` array accepts raw literals and `defineField(...)` results interchangeably, and by-value ref normalization (`source`, `schemas`) still happens in `defineSchema` either way. At runtime `defineField` returns its argument unchanged; at the type level it narrows `name`, `kind`, and the kind's extra properties (including a by-value `source`/`schemas`) to their literals, so inference through `defineSchema` is identical for wrapped and bare fields.

## Exports

Functions:

| Export | Purpose |
|---|---|
| `defineEnum(definition)` | Define an `ENUM` schema |
| `defineSchema(definition)` | Define a `ROOT` or `NODE` schema |
| `defineField(field)` | Optionally wrap one field for strict per-kind checking |
| `defineConfig({ schemas })` | Register the schema list |
| `validate(config)` | Non-throwing authoring-rule checks |
| `toSchemaExport(config)` | Map a config to the `SchemaExport[]` wire format |

Types (all `export type`):

| Group | Types |
|---|---|
| Authoring | `EnumDefinition` (result of `defineEnum`), `ComponentDefinition` (result of `defineSchema`), `SchemaDefinition` (`ComponentDefinition \| EnumDefinition`), `LocalessSchemaConfig` (`{ schemas: readonly SchemaDefinition[] }` — the parameter type of `validate`/`toSchemaExport`), `SchemaFieldInput` (a field as authored, with by-value `source`/`schemas`), `EnumDefinitionInput`, `ComponentDefinitionInput` |
| Inference | `InferContentData`, `InferContent`, `InferEnum` |
| Validation | `ValidationIssue`, `ValidationResult` |
| Wire model (re-exported from `@localess/model`) | `SchemaType`, `SchemaFieldKind`, `AssetFileType`, `SchemaEnumValue`, `SchemaFieldBase`, `SchemaField`, `SchemaFieldText`, `SchemaFieldTextarea`, `SchemaFieldRichText`, `SchemaFieldMarkdown`, `SchemaFieldNumber`, `SchemaFieldColor`, `SchemaFieldDate`, `SchemaFieldDateTime`, `SchemaFieldBoolean`, `SchemaFieldOption`, `SchemaFieldOptions`, `SchemaFieldLink`, `SchemaFieldReference`, `SchemaFieldReferences`, `SchemaFieldAsset`, `SchemaFieldAssets`, `SchemaFieldSchema`, `SchemaFieldSchemas`, `SchemaComponentExport`, `SchemaEnumExport`, `SchemaExport` |
| Content values (re-exported from `@localess/model`) | `ContentAsset`, `ContentLink`, `ContentReference`, `ContentRichText` |

## Type Inference

| Export | Purpose |
|---|---|
| `InferContentData<C>` | Union of every `ROOT` schema's content type in config `C` |
| `InferContent<S, C>` | Content type of one schema definition `S`, resolved against config `C` |
| `InferEnum<E>` | Literal union of an enum definition's values |

Every inferred content type carries `_id: string` and `_schema` as the schema id literal. `required: true` fields become non-optional keys; every other field is optional. `OPTION` fields resolve to the literal union of the referenced enum's values (not plain `string`), `OPTIONS` to an array of that union; `SCHEMA`/`SCHEMAS` fields resolve to the allowed schemas' content types (or every `NODE` schema in the config when `schemas` is omitted), `SCHEMAS` as an array.

Fallbacks when a reference can't be resolved against the config:

- `OPTION`/`OPTIONS` whose `source` id is not in the config → `string` / `string[]` (matching the CLI's `type generate` behavior for unresolved refs).
- `InferEnum` of an enum with no `values` → `string`.
- Unrestricted `SCHEMA`/`SCHEMAS` in a config with no `NODE` schemas → `{ _id: string; _schema: string }` / array of it.
- `InferContentData` of a config with no `ROOT` schema → `never`.

## Field Kinds

| Kind | Extra properties | Inferred type |
|---|---|---|
| `TEXT`, `TEXTAREA`, `MARKDOWN` | `minLength?`, `maxLength?` | `string` |
| `RICH_TEXT` | `minLength?`, `maxLength?` | `ContentRichText` |
| `NUMBER` | `minValue?`, `maxValue?` | `number` |
| `COLOR`, `DATE`, `DATETIME` | — | `string` |
| `BOOLEAN` | — | `boolean` |
| `OPTION` | `source` (required; enum id or `defineEnum` result) | literal union of the referenced enum's values |
| `OPTIONS` | `source` (required), `minValues?`, `maxValues?` | that union, as an array |
| `LINK` | — | `ContentLink` |
| `REFERENCE` / `REFERENCES` | `path?` | `ContentReference` / `ContentReference[]` |
| `ASSET` / `ASSETS` | `fileTypes?: AssetFileType[]`, `fileType?: AssetFileType` | `ContentAsset` / `ContentAsset[]` |
| `SCHEMA` / `SCHEMAS` | `schemas?` (allowed ids or `defineSchema` results; unrestricted when absent) | allowed schemas' content type / array of it |

Every kind also accepts the base properties from `SchemaFieldBase`: `displayName?`, `required?`, `description?`, `defaultValue?`, `translatable?`. `AssetFileType` is `'ANY' | 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'APPLICATION'`.

`ContentAsset`, `ContentLink`, `ContentReference`, and `ContentRichText` are re-exported from `@localess/model`, the shared domain-model package (see ADR 009), as is the whole schema wire model (`SchemaField`, `SchemaExport`, …) — `packages/schema/src/models.ts` is just `export * from '@localess/model'`.

## `validate(config)`

Non-throwing: `{ ok: boolean, issues: ValidationIssue[] }`, where `ValidationIssue = { severity: 'error' | 'warning', code, path, message }`. `ok` is `false` only when at least one error-severity issue is present. The type admits `'warning'`, but every rule implemented today reports `error`. Every schema in the config is checked. `path` is the schema id, or `<schemaId>.<fieldName>` / `<schemaId>.<enumValueName>` for field/enum-value issues.

| Code | Rule |
|---|---|
| `schema/invalid-id` | Schema id matches `/^[a-zA-Z][a-zA-Z0-9]+$/` and is 2-50 characters |
| `schema/reserved-id` | Schema id is not (case-insensitively) one of `Translations`, `Links`, `ContentMetadata`, `ContentReference`, `ContentRichText`, `ContentLink`, `ContentData`, `ContentAsset`, `Content` |
| `schema/display-name-too-long` | Schema `displayName` ≤ 50 characters |
| `schema/description-too-long` | Schema `description` ≤ 250 characters |
| `schema/invalid-label` | Each schema label is 2-50 characters and contains no spaces |
| `enum/invalid-value-name` | `ENUM` value `name` is 1-50 characters |
| `enum/invalid-value` | `ENUM` `value` is 1-50 characters and matches `/^[a-zA-Z]$\|^[a-zA-Z][a-zA-Z0-9-_]*[a-zA-Z0-9]$/` (single letters allowed) |
| `schema/unknown-preview-field` | `previewField` names a field of the same `ROOT`/`NODE` schema |
| `field/invalid-name` | Field name matches `/^[a-z][a-zA-Z0-9_]*[a-zA-Z0-9]$/` (camelCase), is 2-30 characters, and does not contain `_i18n_` |
| `field/reserved-name` | Field name is not (case-insensitively) `_id` or `_schema` |
| `field/display-name-too-long` | Field `displayName` ≤ 30 characters |
| `field/description-too-long` | Field `description` ≤ 250 characters |
| `field/default-value-too-long` | Field `defaultValue` ≤ 250 characters |
| `field/unresolved-source` | `OPTION`/`OPTIONS` `source` is the id of a schema in the config |
| `field/source-not-enum` | ...and that schema is an `ENUM` |
| `field/unresolved-schema-ref` | Each `SCHEMA`/`SCHEMAS` `schemas` entry is the id of a schema in the config |
| `field/schema-ref-is-enum` | ...and that schema is a `ROOT`/`NODE`, not an `ENUM` |

Not covered by `validate()`: stray properties from the wrong field kind (use `defineField`), duplicate field names / schema ids (`defineSchema` / `defineConfig` throw on those).

## `toSchemaExport(config)`

Pure mapping from a config to `SchemaExport[]`, preserving order — the wire format the Localess API accepts (`POST /schemas`) and returns (`GET /schemas`). Strips `undefined`-valued keys from each schema and from the items of its array properties (`fields`, `values`), so the output round-trips through `JSON.stringify` unchanged; performs no I/O.

## Known Limitation

A bare field literal inside `defineSchema`'s `fields` array does not reject a stray property from the wrong field kind (e.g. `maxLength` on a `NUMBER` field) at the call site — a TypeScript limitation on object literals inside a `const`-inferred generic array parameter. Wrap the field in `defineField(...)` (see "Optional: `defineField`" above) to get that check. Missing required properties (e.g. omitting `source` on `OPTION`) are still caught either way. See [ADR 008](decisions/008-schema-package.md) for the full explanation.
