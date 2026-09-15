<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/model

The shared domain-model types for the [Localess](https://github.com/Lessify/localess) headless CMS — `Content`, `ContentAsset`, `ContentLink`, `ContentReference`, `Locale`, `Space`, `Translations` and the rest of the shapes the Localess API returns.

Every other `@localess/*` package builds on these types and re-exports the ones it touches, so you rarely install this package directly. Reach for it when you want the types **without** a runtime dependency: a shared `types` workspace, a server DTO, a fixture file, or a package of your own that describes Localess content without talking to the API.

**Zero dependencies of any kind.** `package.json` has no `dependencies` key at all, and the published bundle exports no runtime values — importing it costs nothing at runtime. See [ADR 009](../../docs/decisions/009-shared-model-package.md).

## Requirements

- Node.js >= 24.0.0

## Installation

```bash
# npm
npm install @localess/model

# yarn
yarn add @localess/model

# pnpm
pnpm add @localess/model
```

---

## The shape of a content response

`Content<T>` is the envelope returned by `getContentBySlug` / `getContentById`; `T` is the shape of its `data`. This is a real response body, trimmed from the [schema playground](../../playgrounds/schema):

```ts
import type { Content } from '@localess/model';

const response: Content<PageContent> = {
  id: 'Sud2GFSZFjGhwAeje25H',
  name: 'Home',
  locale: 'en',
  kind: 'DOCUMENT',
  slug: 'home',
  fullSlug: 'home',
  parentSlug: '',
  createdAt: '2025-04-17T07:58:46.492Z',
  updatedAt: '2026-08-31T15:39:32.553Z',
  publishedAt: '2026-08-31T15:39:39.469Z',
  data: {
    _id: '9cf406ab-939b-4855-a700-eba3dd77ccd6',
    _schema: 'Page',
    title: 'Hello World',
    buttons: [
      { _id: 'e188a55d-8f78-47af-b412-40f2460bd33c', _schema: 'Button', label: 'Primary', type: 'primary' },
      { _id: 'a1635a22-e214-49e4-8349-cf41d239c770', _schema: 'Button', label: 'Secondary', type: 'secondary' },
    ],
  },
};
```

Every content block carries `_id` and `_schema` — that pair is what the Visual Editor uses to map a rendered element back to the block a user clicked, and what `localessEditable()` reads.

To get `PageContent` inferred from your schema definitions instead of writing it by hand, see [`@localess/schema`](../schema).

---

## Core types

| Type | Shape |
|---|---|
| `Content<T>` | The response envelope: `id`, `name`, `slug`, `fullSlug`, `parentSlug`, `kind`, timestamps, and `data: T` |
| `ContentData` | A content block — always has `_id` and `_schema`, plus your schema's fields |
| `ContentDataSchema` | Just the `_id` / `_schema` pair every block carries |
| `ContentAsset` | `{ kind: 'ASSET'; uri: string }` — a reference to an uploaded file |
| `ContentLink` | `{ kind: 'LINK'; target: '_blank' \| '_self'; type: 'url' \| 'content'; uri: string }` |
| `ContentReference` | `{ kind: 'REFERENCE'; uri: string }` |
| `ContentRichText` | A loose placeholder for rich text — for the precise node/mark union use [`@localess/richtext`](../richtext) |
| `Links` | `Record<string, ContentMetadata>` — resolved link targets |
| `References` | `Record<string, Content>` — resolved references |
| `Assets` | `Record<string, AssetMetadata>` — resolved asset metadata |
| `Locale` | A space locale: `id`, `name` |
| `Space` | Space metadata |
| `Translations` | `Record<string, string>` |

The schema wire model (`SchemaExport`, `SchemaField`, `SchemaFieldKind`, …) also lives here, so `@localess/schema` and `@localess/cli` agree on the format without depending on each other.

---

## Assets

`ContentAsset` is only a URI. When you fetch with `resolveAsset: true`, the API additionally returns an `Assets` map of `AssetMetadata`:

```ts
import type { AssetMetadata } from '@localess/model';

// `width`/`height` let you reserve the layout box before the image loads,
// instead of paying a request to find out how big it is.
function describe(meta: AssetMetadata): string {
  const megabytes = (meta.size / 1024 / 1024).toFixed(1);
  return `${meta.name}${meta.extension} — ${meta.width}×${meta.height}, ${megabytes} MB`;
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique identifier |
| `name` | `string` | File name, without extension |
| `extension` | `string` | Including the dot, e.g. `.jpg` |
| `type` | `string` | MIME type |
| `size` | `number` | **Required.** File size in bytes — the one field you cannot derive from any other |
| `alt?` | `string` | Alternative text |
| `width?` / `height?` | `number` | Rendered pixels, EXIF orientation already applied. Use them to reserve the layout box before the image loads |
| `duration?` | `number` | Playback length in whole seconds, for video and animated images |

`AssetTransformParams` describes the image transforms `assetLink()` accepts — `w`, `h`, `q`, `f`, `fit`, `thumbnail`. `fit` applies only when **both** `w` and `h` are set.

> **Changed in v4.** The `download` parameter was removed. Use the client's `assetDownloadLink(asset)` instead.

---

## Related

- [`@localess/client`](../client) — fetches the content these types describe
- [`@localess/schema`](../schema) — infers `ContentData` shapes from your schema definitions
- [`@localess/richtext`](../richtext) — the precise rich text node model
- [docs/model.md](../../docs/model.md) — full type reference

## License

See the [Localess](https://github.com/Lessify/localess) repository.
