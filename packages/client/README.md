<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess JavaScript / TypeScript Client SDK

The `@localess/client` package is the core JavaScript/TypeScript SDK for the [Localess](https://github.com/Lessify/localess) headless CMS platform. It provides a type-safe API client for fetching content, translations, and assets, along with Visual Editor integration utilities.

> **⚠️ Security Notice:**
> This SDK is designed for **server-side use only**. It requires a Localess API Token that must be kept secret.
> Never use this package in browser/client-side code, as it would expose your API token to the public.
> In React applications, always fetch data server-side (e.g., Next.js Server Components, API routes, or server-side rendering).

## Requirements

- Node.js >= 20.0.0

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

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `origin` | `string` | ✅ | — | Fully qualified domain with protocol (e.g., `https://my-localess.web.app`) |
| `spaceId` | `string` | ✅ | — | Localess Space ID, found in Space settings |
| `token` | `string` | ✅ | — | Localess API token, found in Space settings |
| `version` | `'draft' \| string` | ❌ | `'published'` | Default content version to fetch |
| `debug` | `boolean` | ❌ | `false` | Enable debug logging |
| `cacheTTL` | `number \| false` | ❌ | `300000` | Cache TTL in milliseconds (5 minutes). Set `false` to disable caching |

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

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | `'draft' \| string` | Client default | Override the client's default content version |
| `locale` | `string` | — | ISO 639-1 locale code (e.g., `'en'`, `'de'`) |
| `resolveReference` | `boolean` | `false` | Resolve content references inline |
| `resolveLink` | `boolean` | `false` | Resolve content links inline |

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `kind` | `'DOCUMENT' \| 'FOLDER'` | Filter results by content kind |
| `parentSlug` | `string` | Filter by parent slug (e.g., `'legal/policy'`) |
| `excludeChildren` | `boolean` | When `true`, excludes nested sub-slugs from results |

---

## Fetching Translations

### `getTranslations(locale)`

Fetch all translations for a given locale. Returns a flat key-value map.

```ts
const translations = await client.getTranslations('en');
// { "common.submit": "Submit", "nav.home": "Home", ... }
```

---

## Assets

### `assetLink(asset)`

Generate a fully qualified URL for a content asset.

```ts
import { localessClient } from "@localess/client";

const client = localessClient({ origin, spaceId, token });

// From a ContentAsset object
const url = client.assetLink(content.data.image);

// From a URI string
const url = client.assetLink('/spaces/abc/assets/photo.jpg');
```

---

## Visual Editor Integration

### `loadLocalessSync(origin, force?)`

Injects the Localess Visual Editor sync script into the document `<head>`. This enables live-editing capabilities when your site is opened inside the Localess Visual Editor.

```ts
import { loadLocalessSync } from "@localess/client";

loadLocalessSync('https://my-localess.web.app');

// Force injection even when not running inside an iframe
loadLocalessSync('https://my-localess.web.app', true);
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

> **Deprecated:** `llEditable()` and `llEditableField()` are deprecated aliases. Use `localessEditable()` and `localessEditableField()` instead.

---

## Listening to Visual Editor Events

When your application is loaded inside the Localess Visual Editor, you can subscribe to editing events via `window.localess`.

```ts
if (window.localess) {
  // Subscribe to a single event
  window.localess.on('change', (event) => {
    if (event.type === 'change') {
      setPageData(event.data);
    }
  });

  // Subscribe to multiple events
  window.localess.on(['input', 'change'], (event) => {
    if (event.type === 'input' || event.type === 'change') {
      setPageData(event.data);
    }
  });
}
```

### Available Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `{ type: 'input', data: any }` | Fired while a field is being edited (real-time) |
| `change` | `{ type: 'change', data: any }` | Fired after a field value is confirmed |
| `save` | `{ type: 'save' }` | Fired when content is saved |
| `publish` | `{ type: 'publish' }` | Fired when content is published |
| `pong` | `{ type: 'pong' }` | Heartbeat response from the editor |
| `enterSchema` | `{ type: 'enterSchema', id, schema, field? }` | Fired when hovering over a schema element |
| `hoverSchema` | `{ type: 'hoverSchema', id, schema, field? }` | Fired when entering a schema element |

---

## Caching

All API responses are cached by default using a TTL (time-to-live) cache. You can configure caching when initializing the client.

```ts
// Default: 5-minute TTL cache
const client = localessClient({ origin, spaceId, token });

// Custom TTL (e.g., 10 minutes)
const client = localessClient({ origin, spaceId, token, cacheTTL: 600000 });

// Disable caching entirely
const client = localessClient({ origin, spaceId, token, cacheTTL: false });
```

---

## Type Reference

### `Content<T>`

```ts
interface Content<T extends ContentData> extends ContentMetadata {
  data?: T;
  links?: Links;        // Populated when resolveLink: true
  references?: References; // Populated when resolveReference: true
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

### `Translations`

A key-value map of translation keys to translated string values.

---

## Utility Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `isBrowser()` | `boolean` | Returns `true` if code is running in a browser environment |
| `isServer()` | `boolean` | Returns `true` if code is running in a server/Node.js environment |
| `isIframe()` | `boolean` | Returns `true` if the page is rendered inside an iframe |

---

## License

[MIT](../../LICENSE)
