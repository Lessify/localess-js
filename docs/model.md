# @localess/model Reference

Shared domain-model types for the Localess headless CMS — content, asset,
link, and translation shapes used across every other package in this SDK.

**Zero production dependencies** — one of three root packages, alongside
`@localess/richtext` and `@localess/schema`. → [ADR 009](decisions/009-shared-model-package.md)

## Installation

```bash
npm install @localess/model
```

Most consumers don't install this directly — it's a dependency of
`@localess/client`, `@localess/richtext`, `@localess/schema`, every
framework package, and `@localess/cli`, all of which re-export the types
they need through their own public API.

## Types

| Type | Purpose |
|---|---|
| `Locale` | A single locale (`id`, `name`) |
| `Space` | A Localess space — locales, fallback locale, timestamps |
| `Content<T>` | A content document — metadata plus typed `data`, `links`, `references`, `assets` |
| `ContentData` | The typed, schema-shaped payload of a content document (`_id`, `_schema`, plus schema fields) |
| `ContentDataField` | The union of possible field value types inside `ContentData` |
| `ContentDataSchema` | The `_id`/`_schema` pair every `ContentData` carries |
| `ContentMetadata` | Navigation-oriented content summary (slug, kind, timestamps) |
| `ContentAsset` | A reference to an asset (`kind: 'ASSET'`, `uri`) |
| `ContentLink` | A reference to a link (`kind: 'LINK'`, `target`, `type`, `uri`) |
| `ContentReference` | A reference to another content document (`kind: 'REFERENCE'`, `uri`) |
| `ContentRichText` | A rich text content node (`type?`, `content?`) |
| `Links` | Key-value map of content id → `ContentMetadata` |
| `References` | Key-value map of content id → `Content` |
| `Assets` | Key-value map of asset id → `AssetMetadata` |
| `AssetMetadata` | Resolved asset metadata (`id`, `name`, `extension`, `type`, `alt?`) |
| `AssetTransformParams` | Optional image-transform query parameters for asset URLs |
| `Translations` | Key-value map of translation id → translated string |

## Adding a new shared model

See `packages/model/CONTRIBUTING.md`.
