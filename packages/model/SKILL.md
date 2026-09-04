---
name: localess-model
description: Shared domain-model types for the Localess headless CMS — Content, ContentAsset, ContentLink, ContentReference, ContentRichText, Locale, Space, Translations, related asset/link/reference shapes, and the schema wire model (SchemaExport, SchemaField, SchemaFieldKind). Zero dependencies. Use when you need the canonical shape of a Localess API value.
---

# @localess/model

Pure TypeScript interfaces and types for Localess domain values — no
runtime code, no dependencies. Re-exported through `@localess/client`,
`@localess/richtext`, `@localess/schema`, every framework package, and
`@localess/cli` — most consumers get these types through one of those
packages rather than installing this one directly.

See `docs/model.md` in the repo (or the type table below) for the full list.

## Types

| Type | Shape |
|---|---|
| `Locale` | `{ id: string; name: string }` |
| `Space` | `{ id, name, locales: Locale[], localeFallback: Locale, createdAt, updatedAt }` |
| `Content<T>` | `ContentMetadata & { data?: T; links?: Links; references?: References; assets?: Assets }` |
| `ContentData` | `ContentDataSchema & { [field: string]: ContentDataField \| undefined }` |
| `ContentDataSchema` | `{ _id: string; _schema: string }` — the pair every `ContentData` carries |
| `ContentDataField` | `any \| string \| string[] \| number \| boolean \| ContentLink \| ContentRichText \| ContentData \| ContentData[] \| ContentAsset \| ContentAsset[] \| ContentReference \| ContentReference[]` |
| `ContentMetadata` | `{ id, name, slug, fullSlug, parentSlug, kind: 'FOLDER' \| 'DOCUMENT', createdAt, updatedAt, publishedAt? }` |
| `ContentAsset` | `{ kind: 'ASSET'; uri: string }` |
| `ContentLink` | `{ kind: 'LINK'; target: '_blank' \| '_self'; type: 'url' \| 'content'; uri: string }` |
| `ContentReference` | `{ kind: 'REFERENCE'; uri: string }` |
| `ContentRichText` | `{ type?: string; content?: ContentRichText[] }` |
| `Links` | `Record<string, ContentMetadata>` |
| `References` | `Record<string, Content>` |
| `Assets` | `Record<string, AssetMetadata>` |
| `AssetMetadata` | `{ id, name, extension, type, alt? }` |
| `AssetTransformParams` | `{ w?, h?, q?, f?: 'webp' \| 'jpeg' \| 'png' \| 'avif', download?, thumbnail? }` |
| `Translations` | `Record<string, string>` |

### Schema wire model (moved from `@localess/schema` — ADR 009)

| Type | Shape |
|---|---|
| `SchemaType` | `'ROOT' \| 'NODE' \| 'ENUM'` |
| `SchemaFieldKind` | `'TEXT' \| 'TEXTAREA' \| 'RICH_TEXT' \| 'MARKDOWN' \| 'NUMBER' \| 'COLOR' \| 'DATE' \| 'DATETIME' \| 'BOOLEAN' \| 'OPTION' \| 'OPTIONS' \| 'LINK' \| 'REFERENCE' \| 'REFERENCES' \| 'ASSET' \| 'ASSETS' \| 'SCHEMA' \| 'SCHEMAS'` |
| `AssetFileType` | `'ANY' \| 'IMAGE' \| 'VIDEO' \| 'TEXT' \| 'AUDIO' \| 'APPLICATION'` |
| `SchemaEnumValue` | `{ name: string; value: string }` |
| `SchemaFieldBase` | `{ name, kind, displayName?, required?, description?, defaultValue?, translatable? }` |
| `SchemaField` | Union of `SchemaFieldText \| SchemaFieldTextarea \| SchemaFieldRichText \| SchemaFieldMarkdown \| SchemaFieldNumber \| SchemaFieldColor \| SchemaFieldDate \| SchemaFieldDateTime \| SchemaFieldBoolean \| SchemaFieldSchema \| SchemaFieldSchemas \| SchemaFieldOption \| SchemaFieldOptions \| SchemaFieldLink \| SchemaFieldReference \| SchemaFieldReferences \| SchemaFieldAsset \| SchemaFieldAssets` (each extends `SchemaFieldBase`) |
| `SchemaFieldText`, `SchemaFieldTextarea`, `SchemaFieldRichText`, `SchemaFieldMarkdown` | `SchemaFieldBase & { kind: 'TEXT' \| 'TEXTAREA' \| 'RICH_TEXT' \| 'MARKDOWN'; minLength?: number; maxLength?: number }` |
| `SchemaFieldNumber` | `SchemaFieldBase & { kind: 'NUMBER'; minValue?: number; maxValue?: number }` |
| `SchemaFieldColor`, `SchemaFieldDate`, `SchemaFieldDateTime`, `SchemaFieldBoolean`, `SchemaFieldLink` | `SchemaFieldBase & { kind: 'COLOR' \| 'DATE' \| 'DATETIME' \| 'BOOLEAN' \| 'LINK' }` — no extras |
| `SchemaFieldOption` | `SchemaFieldBase & { kind: 'OPTION'; source: string }` (`source` = ENUM schema id) |
| `SchemaFieldOptions` | `SchemaFieldBase & { kind: 'OPTIONS'; source: string; minValues?: number; maxValues?: number }` |
| `SchemaFieldReference`, `SchemaFieldReferences` | `SchemaFieldBase & { kind: 'REFERENCE' \| 'REFERENCES'; path?: string }` |
| `SchemaFieldAsset`, `SchemaFieldAssets` | `SchemaFieldBase & { kind: 'ASSET' \| 'ASSETS'; fileTypes?: AssetFileType[]; fileType?: AssetFileType }` |
| `SchemaFieldSchema`, `SchemaFieldSchemas` | `SchemaFieldBase & { kind: 'SCHEMA' \| 'SCHEMAS'; schemas?: string[] }` (allowed schema ids; unrestricted when absent) |
| `SchemaComponentExport` | `{ id, type: 'ROOT' \| 'NODE', displayName?, description?, labels?, previewField?, fields?: SchemaField[] }` |
| `SchemaEnumExport` | `{ id, type: 'ENUM', displayName?, description?, labels?, values?: SchemaEnumValue[] }` |
| `SchemaExport` | `SchemaComponentExport \| SchemaEnumExport` |

All of these are re-exported unchanged by `@localess/schema` (its
`src/models.ts` is `export * from '@localess/model'`); `@localess/schema`
adds the authoring/inference layer on top (`defineSchema`, `defineField`,
`InferContentData`, `validate`, …).
