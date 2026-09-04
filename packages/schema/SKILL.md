---
name: localess-schema
description: Programmatic Localess schema definitions in TypeScript, with pure type inference of content types (no codegen). Use when defining ROOT/NODE/ENUM schemas in code, deriving content types from those definitions, or validating/exporting a schema config before pushing it to a Localess space via `@localess/cli`.
---

# @localess/schema

Define Localess schemas (ROOT content types, NODE nested components, ENUM
option sets) in TypeScript and derive content types from them by pure type
inference — no build step, no generated `.d.ts` file. Zero external
dependencies: its only dependency is `@localess/model`, the shared,
dependency-free domain-model package (ADR 009).

`@localess/cli`'s `schema pull`/`push`/`diff`/`validate` commands sync
definitions written with this package to and from a Localess space. See that
package's docs for the sync workflow; this package only defines, validates,
infers, and exports — it does no I/O.

## Quick start

```ts
import { defineConfig, defineEnum, defineSchema } from '@localess/schema';
import type { InferContentData } from '@localess/schema';

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
    { name: 'type', kind: 'OPTION', source: ButtonType }, // by-value ref, normalized to 'ButtonType'
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

// Content = { _id: string; _schema: 'Page'; title: string; blocks?: ButtonContent[] }
export type Content = InferContentData<typeof config>;
```

## API reference

| Export | Purpose |
|---|---|
| `defineEnum(definition)` | Define an ENUM schema. Identity function; injects `type: 'ENUM'`. |
| `defineSchema(definition)` | Define a ROOT or NODE schema. Normalizes by-value refs (`source`, `schemas`) to id strings. Throws on duplicate field names. |
| `defineField(field)` | Define a single field, narrowed by `kind`. Optional; catches a stray property from the wrong kind at the call site, unlike a bare field literal. Identity function. |
| `defineConfig({ schemas })` | Register the full schema list — the unit the CLI loads and inference resolves against. Throws on duplicate schema ids. |
| `validate(config)` | Non-throwing `{ ok, issues }` — ID/name patterns, reserved names, length limits, reference resolution. |
| `toSchemaExport(config)` | Pure mapping to the wire format (`SchemaExport[]`) the Localess API accepts/returns. |
| `InferContentData<C>` | Union of every ROOT schema's content type in config `C`. |
| `InferContent<S, C>` | Content type of one schema definition `S`, resolved against config `C`. |
| `InferEnum<E>` | Literal union of an enum definition's values. |

### Exported types

Everything below is `export type` — importable with `import type { ... } from '@localess/schema'`.

| Group | Types |
|---|---|
| Authoring (from `define.ts`) | `EnumDefinition` (result of `defineEnum`), `ComponentDefinition` (result of `defineSchema`), `SchemaDefinition` (`ComponentDefinition \| EnumDefinition`), `LocalessSchemaConfig` (`{ schemas: readonly SchemaDefinition[] }` — what `validate`/`toSchemaExport` accept), `SchemaFieldInput` (a field as authored: `source`/`schemas` accept by-value refs), `EnumDefinitionInput`, `ComponentDefinitionInput` |
| Inference (from `infer.ts`) | `InferContentData`, `InferContent`, `InferEnum` |
| Validation (from `validate.ts`) | `ValidationIssue` (`{ severity: 'error' \| 'warning'; code; path; message }`), `ValidationResult` (`{ ok; issues }`) |
| Wire model (re-exported from `@localess/model`) | `SchemaType`, `SchemaFieldKind`, `AssetFileType`, `SchemaEnumValue`, `SchemaFieldBase`, `SchemaField`, the 18 per-kind interfaces (`SchemaFieldText`, `SchemaFieldTextarea`, `SchemaFieldRichText`, `SchemaFieldMarkdown`, `SchemaFieldNumber`, `SchemaFieldColor`, `SchemaFieldDate`, `SchemaFieldDateTime`, `SchemaFieldBoolean`, `SchemaFieldOption`, `SchemaFieldOptions`, `SchemaFieldLink`, `SchemaFieldReference`, `SchemaFieldReferences`, `SchemaFieldAsset`, `SchemaFieldAssets`, `SchemaFieldSchema`, `SchemaFieldSchemas`), `SchemaComponentExport`, `SchemaEnumExport`, `SchemaExport` |
| Content values (re-exported from `@localess/model`) | `ContentAsset`, `ContentLink`, `ContentReference`, `ContentRichText` |

## `defineField`

Optional. Wraps a single field so TypeScript catches a stray property from
the wrong `kind` at the call site — something a bare field literal inside
`defineSchema({ fields: [...] })` cannot do:

```ts
import { defineField } from '@localess/schema';

defineField({ name: 'amount', kind: 'NUMBER', maxLength: 5 });
// ^ compile error: maxLength is not valid on a NUMBER field

defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 }); // OK
```

`defineSchema`'s `fields` array accepts raw literals and `defineField(...)`
results interchangeably — by-value ref normalization (`source`, `schemas`)
still happens exclusively in `defineSchema`, regardless of a field's origin.

## By-value references

`OPTION`/`OPTIONS` fields accept an enum definition (or a string id) in
`source`; `SCHEMA`/`SCHEMAS` fields accept schema definitions (or string ids)
in `schemas`. Both are normalized to string ids at runtime by `defineSchema`,
matching the wire format exactly — but the *type* keeps the literal id, so
`InferContent` resolves `OPTION` fields to the referenced enum's literal
value union instead of plain `string`, and `SCHEMA`/`SCHEMAS` fields to the
allowed schemas' content types (or every `NODE` schema in the config when the
`schemas` list is omitted).

Fallbacks when a reference can't be resolved against the config:

- `OPTION`/`OPTIONS` whose `source` id is not in the config → `string` (or
  `string[]`), mirroring the CLI's `type generate` behavior.
- `InferEnum` of an enum with no `values` → `string`.
- Unrestricted `SCHEMA`/`SCHEMAS` (no `schemas` list) in a config with no
  `NODE` schemas → `{ _id: string; _schema: string }` (or an array of it).
- `InferContentData` of a config with no `ROOT` schema → `never`.

## Field kinds

Every field carries `name`, `kind`, and the base optional properties
(`displayName`, `required`, `description`, `defaultValue`, `translatable`).
`required: true` fields are non-optional keys on the inferred content type;
everything else is optional.

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

`AssetFileType` is `'ANY' | 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO' | 'APPLICATION'`.

`ContentAsset`, `ContentLink`, `ContentReference`, and `ContentRichText` are
re-exported from `@localess/model`, the shared domain-model package (see
ADR 009).

## `validate(config)`

Non-throwing. Returns `{ ok, issues }`; `ok` is `false` only when at least
one `error`-severity issue is present (the `ValidationIssue` type allows
`'warning'`, but every rule currently implemented reports `error`). Every
schema in the config is checked, not just the first. Rules and their `code`:

| Code | Rule |
|---|---|
| `schema/invalid-id` | Schema id must match `/^[a-zA-Z][a-zA-Z0-9]+$/` and be 2-50 characters. |
| `schema/reserved-id` | Schema id must not be (case-insensitively) `Translations`, `Links`, `ContentMetadata`, `ContentReference`, `ContentRichText`, `ContentLink`, `ContentData`, `ContentAsset`, or `Content`. |
| `schema/display-name-too-long` | Schema `displayName` ≤ 50 characters. |
| `schema/description-too-long` | Schema `description` ≤ 250 characters. |
| `schema/invalid-label` | Each label 2-50 characters, no spaces. |
| `enum/invalid-value-name` | ENUM value `name` 1-50 characters. |
| `enum/invalid-value` | ENUM `value` 1-50 characters matching `/^[a-zA-Z]$\|^[a-zA-Z][a-zA-Z0-9-_]*[a-zA-Z0-9]$/`. |
| `schema/unknown-preview-field` | `previewField` must name a field of the same schema. |
| `field/invalid-name` | Field name must match `/^[a-z][a-zA-Z0-9_]*[a-zA-Z0-9]$/` (camelCase), be 2-30 characters, and not contain `_i18n_`. |
| `field/reserved-name` | Field name must not be (case-insensitively) `_id` or `_schema`. |
| `field/display-name-too-long` | Field `displayName` ≤ 30 characters. |
| `field/description-too-long` | Field `description` ≤ 250 characters. |
| `field/default-value-too-long` | Field `defaultValue` ≤ 250 characters. |
| `field/unresolved-source` | `OPTION`/`OPTIONS` `source` must be the id of a schema in the config. |
| `field/source-not-enum` | ...and that schema must be an `ENUM`. |
| `field/unresolved-schema-ref` | Every `SCHEMA`/`SCHEMAS` `schemas` entry must be the id of a schema in the config. |
| `field/schema-ref-is-enum` | ...and that schema must be `ROOT` or `NODE`, not `ENUM`. |

`validate` does not check for stray properties from the wrong field kind —
use `defineField` for that (below). Duplicate field names and duplicate
schema ids are not validation issues either: `defineSchema`/`defineConfig`
throw on them as programming errors.

## `toSchemaExport(config)`

Pure mapping to `SchemaExport[]`, preserving schema order. Strips
`undefined`-valued keys from each schema and from the items of its array
properties (`fields`, `values`), so the result round-trips through JSON
unchanged. Performs no I/O.

## Known limitation (mitigated by `defineField`)

TypeScript's excess-property check doesn't apply to object literals inside
an array passed through a `const`-inferred generic parameter (only to
literals checked directly against a declared type). A stray property from
the wrong field kind — e.g. `maxLength` on a `NUMBER` field — inside a bare
field literal in `defineSchema({ fields: [...] })` is therefore not flagged
at the call site. Wrap the field in `defineField(...)` instead to get that
check while keeping full literal-type preservation (see "`defineField`"
above). Missing required properties (e.g. omitting `source` on `OPTION`) are
still caught either way. `validate()` and the Localess backend's schema
validation don't check for this either today.
