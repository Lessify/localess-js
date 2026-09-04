<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess JavaScript / TypeScript Client SDK

The `@localess/client` package is the core JavaScript/TypeScript SDK for the [Localess](https://github.com/Lessify/localess) headless CMS platform. It provides a type-safe API client for fetching content, translations, and assets, along with Visual Editor integration utilities.

> **⚠️ Security Notice:**
> This SDK is designed for **server-side use only**. Never import this package in browser/client-side code.
> A **secret** API token must never be exposed client-side. Localess also issues **public tokens** (read-only, published content and translations only) that are safe to use in the browser — but only through a framework package's client-side primitives (currently `@localess/react`, `@localess/angular`, `@localess/vue`, and `@localess/svelte`), never by importing `@localess/client` directly in the browser. See [ADR 001](../../docs/decisions/001-server-side-only.md).
> In React applications, always fetch data server-side (e.g., Next.js Server Components, API routes, or server-side rendering).

The data-model types this package returns (`Content`, `ContentAsset`, `ContentLink`, `Locale`, `Space`, `Translations`, …) are defined in [`@localess/model`](../model) and re-exported here, so `import type { Content } from '@localess/client'` keeps working.

## Requirements

- Node.js >= 24.0.0

## Installation

```bash
# npm
npm install @localess/client

# yarn
yarn add @localess/client

# pnpm
pnpm add @localess/client
```

---

## Getting Started

### Initializing the Client

```ts
import { localessClient } from "@localess/client";

const client = localessClient({
  origin: 'https://my-localess.web.app', // Fully qualified domain with protocol
  spaceId: 'YOUR_SPACE_ID',              // Found in Localess Space settings
  token: 'YOUR_API_TOKEN',               // Found in Localess Space settings (keep secret!)
});
```

### Client Options

| Option            | Type              | Required | Default       | Description                                                                                                                                                                                                 |
|-------------------|-------------------|----------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `origin`          | `string`          | ✅        | —             | Fully qualified domain with protocol (e.g., `https://my-localess.web.app`)                                                                                                                                  |
| `spaceId`         | `string`          | ✅        | —             | Localess Space ID, found in Space settings                                                                                                                                                                  |
| `token`           | `string`          | ✅        | —             | Localess API token, found in Space settings                                                                                                                                                                 |
| `version`         | `'draft'`         | ❌        | `'published'` | Default content version to fetch                                                                                                                                                                            |
| `debug`           | `boolean`         | ❌        | `false`       | Enable debug logging                                                                                                                                                                                        |
| `cacheTTL`        | `number \| false` | ❌        | `300`         | Cache TTL in **seconds** (default: 5 minutes). Set `false` to disable caching entirely                                                                                                                      |

---

## Fetching Content

### `getContentBySlug<T>(slug, params?)`

Fetch a content document by its slug path. Supports generic typing for full type safety.

```ts
// Basic usage
const content = await client.getContentBySlug('docs/overview');

// With type safety (requires generated types from @localess/cli)
import type { Page } from './.localess/localess';

const content = await client.getContentBySlug<Page>('home', {
  locale: 'en',
  resolveReference: true,
  resolveLink: true,
  resolveAsset: true,
});
```

### `getContentById<T>(id, params?)`

Fetch a content document by its unique ID. Accepts the same parameters as `getContentBySlug`.

```ts
const content = await client.getContentById<Page>('FRnIT7CUABoRCdSVVGGs', {
  locale: 'de',
  version: 'draft',
});
```

### Content Fetch Parameters

| Parameter          | Type       | Default        | Description                                   |
|--------------------|------------|----------------|-----------------------------------------------|
| `version`          | `'draft'`  | Client default | Override the client's default content version |
| `locale`           | `string`   | —              | ISO 639-1 locale code (e.g., `'en'`, `'de'`)  |
| `resolveReference` | `boolean`  | `false`        | Resolve content references inline             |
| `resolveLink`      | `boolean`  | `false`        | Resolve content links inline                  |
| `resolveAsset`     | `boolean`  | `false`        | Resolve content assets inline                 |

---

## Fetching Content Links

### `getLinks(params?)`

Fetch all content links from the space, optionally filtered by type or parent.

```ts
// Fetch all links
const links = await client.getLinks();

// Fetch only documents under a specific parent
const legalLinks = await client.getLinks({
  kind: 'DOCUMENT',
  parentSlug: 'legal',
  excludeChildren: false,
});
```

| Parameter         | Type                     | Description                                         |
|-------------------|--------------------------|-----------------------------------------------------|
| `kind`            | `'DOCUMENT' \| 'FOLDER'` | Filter results by content kind                      |
| `parentSlug`      | `string`                 | Filter by parent slug (e.g., `'legal/policy'`)      |
| `excludeChildren` | `boolean`                | When `true`, excludes nested sub-slugs from results |

---

## Fetching Translations

### `getTranslations(locale, params?)`

Fetch all translations for a given locale. Returns a flat key-value map.

```ts
const translations = await client.getTranslations('en');
// { "common.submit": "Submit", "nav.home": "Home", ... }

// Draft translations (overrides the client-level version for this call)
const draft = await client.getTranslations('en', { version: 'draft' });
```

| Parameter | Type      | Default        | Description                                       |
|-----------|-----------|----------------|---------------------------------------------------|
| `version` | `'draft'` | Client default | Override the client's default translation version |

---

## Error Handling

`getLinks`, `getContentBySlug`, `getContentById`, and `getTranslations` reject instead of returning empty data when the request fails.

- A non-2xx HTTP response rejects with a `LocalessApiError`, which exposes `status`, `statusText`, `url` (with the token redacted), `body` (the API's parsed response body, if any — object, string, or `undefined`), and `hint` (a status-specific explanation, e.g. for 401/403/404/429/5xx; on 401/403 it links to the space's token settings page, and any `message`/`status`/`code`/`details` fields in the response body are folded in).
- A request that never reached the API (DNS failure, connection refused, etc.) rejects with a `LocalessNetworkError`, exposing `origin`, `url` (redacted), `hint`, and `cause` (the underlying error).
- Both are also logged via `console.error` as a boxed, human-readable summary before being thrown.

```ts
import { LocalessApiError, LocalessNetworkError, localessClient } from "@localess/client";

try {
  const content = await client.getContentBySlug('home');
} catch (error) {
  if (error instanceof LocalessApiError) {
    console.error(`Localess request failed: ${error.status} ${error.statusText} — ${error.hint}`);
  } else if (error instanceof LocalessNetworkError) {
    console.error(`Could not reach ${error.origin} — ${error.hint}`);
  } else {
    throw error;
  }
}
```

---

## Assets

### `assetLink(asset, params?)`

Generate a fully qualified URL for a content asset: `{origin}/api/v1/spaces/{spaceId}/assets/{uri}`, with optional image transform parameters appended as a query string.

```ts
import { localessClient } from "@localess/client";

const client = localessClient({ origin, spaceId, token });

// From a ContentAsset object
const url = client.assetLink(content.data.image);

// From a URI string
const url = client.assetLink('my-image.png');

// With transform params
const thumb = client.assetLink(content.data.image, { w: 800, h: 600, f: 'webp', q: 90 });
// .../assets/{uri}?w=800&h=600&q=90&f=webp

// Force download
const file = client.assetLink(content.data.file, { download: true });
// .../assets/{uri}?download
```

#### `AssetTransformParams`

| Param       | Type                                  | Description                                                                                   |
|-------------|---------------------------------------|-----------------------------------------------------------------------------------------------|
| `w`         | `number`                              | Target width in pixels. With `h` → cover crop; without → scale proportionally                 |
| `h`         | `number`                              | Target height in pixels. With `w` → cover crop; without → scale proportionally                |
| `q`         | `number` (1–100)                      | Output quality. Applies to JPEG, WebP, AVIF; ignored for PNG. Default: 85                    |
| `f`         | `'webp' \| 'jpeg' \| 'png' \| 'avif'` | Convert to this output format                                                                 |
| `download`  | `boolean`                             | Force a browser download (`Content-Disposition: form-data`)                                   |
| `thumbnail` | `boolean`                             | Extract the first frame of animated WebP/GIF, or a video frame via FFmpeg, before resizing    |

The standalone `buildAssetQueryString(params)` helper that produces this query string is also exported.

---

## Visual Editor Integration

### `loadLocalessSync(origin)`

Injects the Localess Visual Editor sync script (`{origin}/scripts/sync-v1.js`) into the document `<head>`. This enables live-editing capabilities when your site is opened inside the Localess Visual Editor.

Returns a `Promise<void>` that resolves once the script has loaded (or rejects if it fails to load). It resolves immediately, without injecting anything, on the server, when the page is not inside an iframe (with a `console.warn`), or when `window.localess` already exists. Concurrent calls share a single promise.

```ts
import { loadLocalessSync } from "@localess/client";

await loadLocalessSync('https://my-localess.web.app');
```

### `syncScriptUrl()`

Returns the URL of the Localess sync script, useful for manual script injection.

```ts
const scriptUrl = client.syncScriptUrl();
```

### Marking Editable Content

Use these helpers to add Localess editable attributes to your HTML elements, enabling element selection and highlighting in the Visual Editor.

#### `localessEditable(content)`

Marks a content block as editable.

```ts
import { localessEditable } from "@localess/client";

// Returns: { 'data-ll-id': '...', 'data-ll-schema': '...' }
<section {...localessEditable(content.data)}>...</section>
```

#### `localessEditableField<T>(fieldName)`

Marks a specific field within a content block as editable, with type-safe field name inference.

```ts
import { localessEditableField } from "@localess/client";

// Returns: { 'data-ll-field': 'title' }
<h1 {...localessEditableField<MyPage>('title')}>...</h1>
```

---

## Listening to Visual Editor Events

When your application is loaded inside the Localess Visual Editor, you can subscribe to editing events via `window.localess`.

```ts
if (window.localess) {
  // Subscribe to a single event — `event` is typed to that event's variant, no narrowing needed
  window.localess.on('change', (event) => {
    setPageData(event.data);
  });

  // Subscribe to multiple events — `event` is narrowed to the union of those variants
  window.localess.on(['input', 'change'], (event) => {
    setPageData(event.data);
  });

  // Shorthand for on(['input', 'change'], ...)
  window.localess.onChange((event) => {
    setPageData(event.data);
  });
}
```

The `LocalessSync` interface (`on`, `onChange`) and the event types (`EventToApp`, `EventToAppOf`, `EventToAppType`, `EventCallback`) are exported, and `Window.localess` is declared globally by this package. There is no `off()` method — subscribe once.

### Available Event Types

| Event         | Payload                                       | Description                                     |
|---------------|-----------------------------------------------|-------------------------------------------------|
| `input`       | `{ type: 'input', data: any }`                | Fired while a field is being edited (real-time) |
| `change`      | `{ type: 'change', data: any }`               | Fired after a field value is confirmed          |
| `save`        | `{ type: 'save' }`                            | Fired when content is saved                     |
| `publish`     | `{ type: 'publish' }`                         | Fired when content is published                 |
| `unpublish`   | `{ type: 'unpublish' }`                       | Fired when content is unpublished               |
| `pong`        | `{ type: 'pong' }`                            | Heartbeat response from the editor              |
| `enterSchema` | `{ type: 'enterSchema', id, schema, field? }` | Fired when entering a schema element            |
| `hoverSchema` | `{ type: 'hoverSchema', id, schema, field? }` | Fired when hovering over a schema element       |
| `leaveSchema` | `{ type: 'leaveSchema' }`                     | Fired when leaving a schema element             |

---

## Caching

All API responses are cached by default using an in-memory TTL cache. You can configure caching when initializing the client.

```ts
// Default: 5-minute in-memory TTL cache
const client = localessClient({ origin, spaceId, token });

// Custom TTL (e.g., 10 minutes)
const client = localessClient({ origin, spaceId, token, cacheTTL: 600 });

// Disable caching entirely (recommended for draft/preview mode)
const client = localessClient({ origin, spaceId, token, cacheTTL: false });
```

The cache key is the full request URL (including all query parameters). The cache implementations backing this option — `TTLCache` (default), `NoCache` (used for `cacheTTL: false`), and a plain `Cache` — plus the `ICache` interface are exported.

> **Note:** The cache is in-memory and instance-bound. In multi-process deployments (e.g. Next.js parallel build workers), each process has its own independent cache. → [ADR 003](../../docs/decisions/003-ttl-cache-design.md)

---

## Type Reference

All types below are defined in `@localess/model` and re-exported unchanged by `@localess/client`.

### `Content<T>`

```ts
interface Content<T extends ContentData> extends ContentMetadata {
  data?: T;
  links?: Links;            // Populated when resolveLink: true
  references?: References; // Populated when resolveReference: true
  assets?: Assets;          // Populated when resolveAsset: true
}
```

### `ContentMetadata`

```ts
interface ContentMetadata {
  id: string;
  name: string;
  kind: 'FOLDER' | 'DOCUMENT';
  slug: string;
  fullSlug: string;
  parentSlug: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `ContentData`

Base type for all content schema data objects.

```ts
interface ContentDataSchema {
  _id: string;
  _schema: string;
}

interface ContentData extends ContentDataSchema {
  [field: string]: ContentDataField | undefined;
}
```

### `ContentAsset`

```ts
interface ContentAsset {
  kind: 'ASSET';
  uri: string;
}
```

### `ContentLink`

```ts
interface ContentLink {
  kind: 'LINK';
  type: 'url' | 'content';
  target: '_blank' | '_self';
  uri: string;
}
```

### `ContentReference`

```ts
interface ContentReference {
  kind: 'REFERENCE';
  uri: string;
}
```

### `ContentRichText`

```ts
interface ContentRichText {
  type?: string;
  content?: ContentRichText[];
}
```

### `Links`

A key-value map of content IDs to `ContentMetadata` objects.

### `References`

A key-value map of reference IDs to `Content` objects.

### `Assets` / `AssetMetadata`

A key-value map of asset IDs to `AssetMetadata` objects (populated when `resolveAsset: true`).

```ts
interface AssetMetadata {
  id: string;
  name: string;
  extension: string;
  type: string;
  alt?: string;
}
```

### `Translations`

A key-value map of translation keys to translated string values.

### `Locale` / `Space`

```ts
interface Locale {
  id: string;
  name: string;
}

interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdAt: string;
  updatedAt: string;
}
```

`@localess/model`'s schema wire types (`SchemaExport`, `SchemaField`, `SchemaFieldKind`, …) are re-exported too; see [`docs/model.md`](../../docs/model.md).

---

## Utility Functions

| Function                          | Returns   | Description                                                                                                                                    |
|-----------------------------------|-----------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `isBrowser()`                     | `boolean` | Returns `true` if code is running in a browser environment                                                                                     |
| `isServer()`                      | `boolean` | Returns `true` if code is running in a server/Node.js environment                                                                              |
| `isIframe()`                      | `boolean` | Returns `true` if the page is rendered inside an iframe                                                                                        |
| `findLink(links, link)`           | `string`  | Resolves a `ContentLink` to an href: `'/' + fullSlug` looked up in a `Links` map for `type: 'content'` (`'/not-found'` if absent), the raw `uri` for `type: 'url'` |
| `buildAssetQueryString(params?)`  | `string`  | Serialises `AssetTransformParams` into the query string used by `assetLink` (`''` when no params)                                              |

---

## AI Coding Agents

This package ships a [`SKILL.md`](./SKILL.md) file that provides AI coding agents (GitHub Copilot, Claude Code, Cursor, and others) with accurate, up-to-date APIs, patterns, and best practices. Most agents automatically read `SKILL.md` when starting a session.

### Using SKILL.md in your project

`SKILL.md` is included in the npm package, so it is available locally after installation. Reference it from your project's `AGENTS.md` to ensure your agent reads accurate Localess documentation every session:

```markdown
## Localess

@node_modules/@localess/client/SKILL.md
```

The `@` prefix is the syntax used by most agent tools (GitHub Copilot, Claude Code, Cursor) to import file contents inline into the agent context.

When you change the public API of this package, update `SKILL.md` alongside your code:

- **New option or parameter** → add it to the relevant options table and usage example
- **Changed behaviour** → update the description and any affected code snippets
- **Deprecated API** → mark it clearly and point to the replacement

---

## License

[MIT](../../LICENSE)
