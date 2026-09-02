---
name: localess-model
description: Shared domain-model types for the Localess headless CMS — Content, ContentAsset, ContentLink, ContentReference, ContentRichText, Locale, Space, Translations, and related asset/link/reference shapes. Zero dependencies. Use when you need the canonical shape of a Localess API value.
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
| `ContentData` | `{ _id: string; _schema: string; [field: string]: ContentDataField \| undefined }` |
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
