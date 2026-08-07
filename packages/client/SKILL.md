# SKILL: @localess/client

## Overview

`@localess/client` is the **core JavaScript/TypeScript SDK** for the Localess headless CMS. It is a **server-side-only** library — never use it in browser/client-side code because it requires an API token that must remain secret.

**Zero production dependencies.** Requires Node.js >= 24.0.0.

---

## Installation

```bash
npm install @localess/client
```

---

## Initialization

```typescript
import { localessClient } from "@localess/client";

const client = localessClient({
  origin: 'https://my-localess.web.app',  // Full URL with protocol (required)
  spaceId: 'YOUR_SPACE_ID',               // From Space settings (required)
  token: 'YOUR_API_TOKEN',                // API token — NEVER expose client-side (required)
  version: 'draft',                       // undefined = published (default), 'draft' for preview
  debug: false,                           // Logs requests; default: false
  cacheTTL: 300,                          // Cache TTL in seconds; false to disable; default: 300 (5 min)
});
```

---

## API Methods

### Fetch Content by Slug

```typescript
const content = await client.getContentBySlug<Page>('home', {
  locale: 'en',
  resolveReference: true,  // Inline referenced content
  resolveLink: true,        // Inline linked content
  version: 'draft',         // Override client default per-request
});
// content.data is typed as Page
```

### Fetch Content by ID

```typescript
const content = await client.getContentById<Article>('content-id-here', {
  locale: 'en',
  resolveReference: true,
});
```

### Fetch Navigation Links

```typescript
const links = await client.getLinks({
  kind: 'DOCUMENT',          // 'DOCUMENT' | 'FOLDER'
  parentSlug: 'blog',        // Filter to children of a slug
  excludeChildren: false,    // Exclude nested sub-slugs
});
// links: { [id: string]: ContentMetadata }
```

### Fetch Translations

```typescript
const t = await client.getTranslations('en');
// t: { [key: string]: string }
// Usage: t['common.submit'] => 'Submit'

// Fetch draft translations
const t = await client.getTranslations('en', { version: 'draft' });
```

### Asset URL

```typescript
import { localessClient } from "@localess/client";
import type { AssetTransformParams } from "@localess/client";

// Basic — no transform
const url = client.assetLink(content.data.image);
// Returns: https://my-localess.web.app/api/v1/spaces/{spaceId}/assets/{uri}

// With transform params
const url = client.assetLink(content.data.image, { w: 800, h: 600, f: 'webp', q: 90 });
// Returns: .../assets/{uri}?w=800&h=600&q=90&f=webp

// Download
const url = client.assetLink(content.data.file, { download: true });
// Returns: .../assets/{uri}?download

// Accepts ContentAsset or raw URI string
const url = client.assetLink('my-image.png', { w: 400 });
```

#### AssetTransformParams

| Param       | Type                                  | Description                                                                 |
|-------------|---------------------------------------|-----------------------------------------------------------------------------|
| `w`         | `number`                              | Target width in pixels. With `h` → cover crop. Without → scale proportionally. |
| `h`         | `number`                              | Target height in pixels. With `w` → cover crop. Without → scale proportionally. |
| `q`         | `number` (1–100)                      | Output quality. Applies to JPEG, WebP, AVIF. Ignored for PNG. Default: 85. |
| `f`         | `'webp' \| 'jpeg' \| 'png' \| 'avif'` | Convert to this output format.                                              |
| `download`  | `boolean`                             | `true` → force browser download (Content-Disposition: form-data).          |
| `thumbnail` | `boolean`                             | `true` → extract first frame from animated WebP/GIF or video frame via FFmpeg. |

SVG files are always passed through unchanged. `w`/`h`/`f` are ignored for SVG.

---

## Content Fetch Parameters (`ContentFetchParams`)

| Parameter          | Type                   | Default     | Description                               |
|--------------------|------------------------|-------------|-------------------------------------------|
| `version`          | `'draft' \| undefined` | `undefined` | `'draft'` for preview, omit for published |
| `locale`           | `string`               | —           | ISO 639-1 code: `'en'`, `'de'`, etc.      |
| `resolveReference` | `boolean`              | `false`     | Inline referenced content objects         |
| `resolveLink`      | `boolean`              | `false`     | Inline linked content metadata            |

## Translation Fetch Parameters (`TranslationFetchParams`)

| Parameter | Type                   | Default     | Description                               |
|-----------|------------------------|-------------|-------------------------------------------|
| `version` | `'draft' \| undefined` | `undefined` | `'draft'` for preview, omit for published |

---

## Caching

- Default: in-memory TTL cache, **5 minutes** (300,000 ms)
- Cache key = full request URL (includes all parameters)
- `cacheTTL: false` always disables caching, regardless of other options

### cacheTTL

Controls whether caching is enabled and the TTL duration (in **seconds**):

```typescript
localessClient({ cacheTTL: 60 })    // 1 minute TTL — frequently updated content
localessClient({ cacheTTL: 3600 })  // 1 hour TTL   — rarely updated content
localessClient({ cacheTTL: false }) // Disabled      — always fresh (use in draft/preview mode)
```

The cache is in-memory and instance-bound — each `localessClient()` instance has its own cache, and multi-process deployments (e.g. Next.js parallel build workers) do not share cache entries across processes.

---

## Visual Editor Integration

### Inject Sync Script

```typescript
import { loadLocalessSync } from "@localess/client";

// Call in browser context (e.g., inside useEffect or layout script)
loadLocalessSync('https://my-localess.web.app');
// Injects the Localess sync script into <head>; no-op if not in iframe
```

### Mark Elements as Editable

```typescript
import { localessEditable, localessEditableField } from "@localess/client";

// Root element of a content block
<section {...localessEditable(data)}>
  {/* Adds: data-ll-id (from _id), data-ll-schema (from _schema) */}

  {/* Individual editable field */}
  <h1 {...localessEditableField<Page>('title')}>
    {/* Adds: data-ll-field="title" */}
    {data.title}
  </h1>
</section>
```

> **Note:** `localessEditable` reads `content._id` and `content._schema`.

### Listen to Editor Events

```typescript
// Only available when app is loaded inside the Localess Visual Editor iframe
if (window.localess) {
  window.localess.on(['input', 'change'], (event) => {
    setPageData(event.data); // Real-time preview update — event is narrowed to the 'input' | 'change' variant, no type check needed
  });
  // No .off() method — subscribe once on mount
}
```

> `on`'s callback type is inferred from the event(s) passed in — subscribing to `['input', 'change']` narrows `event` to the variant carrying `data`, so no manual `event.type === ...` check is needed inside the callback.

`window.localess.onChange(callback)` is shorthand for `on(['input', 'change'], callback)` — it fires only for content-change events, with `callback` narrowed to that variant.

**Event types:**

| Event         | When                                  |
|---------------|---------------------------------------|
| `input`       | User is typing in a field (real-time) |
| `change`      | Field value confirmed                 |
| `save`        | Content saved                         |
| `publish`     | Content published                     |
| `unpublish`   | Content unpublished                   |
| `pong`        | Editor heartbeat response             |
| `enterSchema` | User enters a schema element          |
| `hoverSchema` | User hovers over a schema element     |
| `leaveSchema` | User leaves a schema element          |

---

## Key Data Types

```typescript
// Content response wrapper
interface Content<T extends ContentData> extends ContentMetadata {
  data?: T;
  links?: Links;
  references?: References;
}

// Base schema fields every content data object has
interface ContentDataSchema {
  _id: string;
  _schema: string;
}

// Asset reference
interface ContentAsset {
  kind: 'ASSET';
  uri: string;
}

// Internal or external link
interface ContentLink {
  kind: 'LINK';
  type: 'url' | 'content';
  target: '_blank' | '_self';
  uri: string;
}

// Rich text (Tiptap JSON format)
interface ContentRichText {
  type?: string;
  content?: ContentRichText[];
}

// Reference to another content item
interface ContentReference {
  kind: 'REFERENCE';
  uri: string;
}

// Navigation links map
interface Links {
  [contentId: string]: ContentMetadata;
}

// Translations flat map
interface Translations {
  [key: string]: string;
}
```

---

## Environment Safety Utilities

```typescript
import { isBrowser, isServer, isIframe } from "@localess/client";

isBrowser()  // true if window is defined
isServer()   // true if window is undefined
isIframe()   // true if running inside an iframe (browser only)
```

---

## Best Practices

1. **Never import `@localess/client` in browser bundles.** Use it only in server-side code: Next.js Server Components, API routes, `getServerSideProps`, Remix loaders, etc.

2. **Store credentials in environment variables**, not hardcoded:
   ```
   LOCALESS_ORIGIN=https://my-localess.web.app
   LOCALESS_SPACE_ID=your-space-id
   LOCALESS_TOKEN=your-api-token
   ```

3. **Create one client instance** and reuse it — the cache is instance-bound.

4. **Use generated types** from `@localess/cli` (`localess types generate`) for full type safety:
   ```typescript
   import type { Page } from './.localess/localess';
   const content = await client.getContentBySlug<Page>('home');
   ```

5. **Use `version: 'draft'` and `cacheTTL: false` for preview/editing** environments.

6. **Use `resolveReference: true`** only when you need inline reference data — it increases payload size.

---

## Exports Reference

```typescript
export { localessClient }                          // Client factory
export { localessEditable, localessEditableField } // Visual editor helpers
export { loadLocalessSync }                        // Sync script injector
export { isBrowser, isServer, isIframe }           // Environment utilities
export { buildAssetQueryString }                   // Asset query string serialiser
export type {
  LocalessClient, LocalessClientOptions,
  ContentFetchParams, LinksFetchParams, TranslationFetchParams,
  Content, ContentData, ContentDataSchema, ContentDataField,
  ContentMetadata, ContentAsset, ContentLink,
  ContentRichText, ContentReference,
  Links, References, Translations,
  LocalessSync, EventToApp, EventToAppOf, EventCallback, EventToAppType,
  AssetTransformParams,
}
```
