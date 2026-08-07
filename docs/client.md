# @localess/client Reference

Core JavaScript/TypeScript SDK for the Localess headless CMS.

**Server-side only** — requires an API token that must never reach the browser. Use in Next.js Server Components, API routes, `getServerSideProps`, Remix loaders, etc. → [ADR 001](decisions/001-server-side-only.md)

**Zero production dependencies** — no runtime deps beyond Node.js >= 24.0.0. → [ADR 002](decisions/002-zero-production-deps.md)

## Installation

```bash
npm install @localess/client
```

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

Store credentials in environment variables:
```
LOCALESS_ORIGIN=https://my-localess.web.app
LOCALESS_SPACE_ID=your-space-id
LOCALESS_TOKEN=your-api-token
```

## API Methods

### `getContentBySlug<T>(slug, params?)`

```typescript
const content = await client.getContentBySlug<Page>('home', {
  locale: 'en',
  resolveReference: true,  // Inline referenced content objects
  resolveLink: true,        // Inline linked content metadata
  resolveAsset: true,       // Inline referenced asset metadata
  version: 'draft',         // Override client default per-request
});
// content.data is typed as Page
```

### `getContentById<T>(id, params?)`

```typescript
const content = await client.getContentById<Article>('content-id-here', {
  locale: 'en',
  resolveReference: true,
});
```

### `getLinks(params?)`

```typescript
const links = await client.getLinks({
  kind: 'DOCUMENT',          // 'DOCUMENT' | 'FOLDER'
  parentSlug: 'blog',        // Filter to children of a slug
  excludeChildren: false,    // Exclude nested sub-slugs
});
// links: { [id: string]: ContentMetadata }
```

### `getTranslations(locale, params?)`

```typescript
const t = await client.getTranslations('en', { version: 'draft' }); // params optional, overrides client default
// t: { [key: string]: string }
// Usage: t['common.submit'] => 'Submit'
```

### `assetLink(asset, params?)`

```typescript
// Basic — no transform
const url = client.assetLink(content.data.image);
// Returns: https://my-localess.web.app/api/v1/spaces/{spaceId}/assets/{uri}

// With transform params
const url = client.assetLink(content.data.image, { w: 800, h: 600, f: 'webp', q: 90 });

// Download link
const url = client.assetLink(content.data.file, { download: true });

// Accepts ContentAsset or raw URI string
const url = client.assetLink('my-image.png', { w: 400 });
```

## Content Fetch Parameters

| Parameter          | Type                   | Default     | Description                               |
|--------------------|------------------------|-------------|-------------------------------------------|
| `version`          | `'draft' \| undefined` | `undefined` | `'draft'` for preview, omit for published |
| `locale`           | `string`               | —           | ISO 639-1 code: `'en'`, `'de'`, etc.      |
| `resolveReference` | `boolean`              | `false`     | Inline referenced content objects         |
| `resolveLink`      | `boolean`              | `false`     | Inline linked content metadata            |
| `resolveAsset`     | `boolean`              | `false`     | Inline referenced asset metadata          |

## Error Handling

`getLinks`, `getContentBySlug`, `getContentById`, and `getTranslations` throw instead of returning empty data on failure. Network failures reject with the underlying error; non-2xx HTTP responses reject with a `LocalessApiError` (`status`, `statusText`, `url`). Always wrap calls in `try`/`catch`:

```typescript
import { LocalessApiError } from "@localess/client";

try {
  const content = await client.getContentBySlug('home');
} catch (error) {
  if (error instanceof LocalessApiError) {
    console.error(error.status, error.statusText);
  }
}
```

## Caching

Default: in-memory TTL cache, **5 minutes** (300 seconds). Cache key = full request URL. → [ADR 003](decisions/003-ttl-cache-design.md)

```typescript
localessClient({ cacheTTL: 60 })    // 1 min — frequently updated content
localessClient({ cacheTTL: 3600 })  // 1 hour — rarely updated content
localessClient({ cacheTTL: false }) // Disabled — always fresh (use in draft/preview mode)
```

## Visual Editor Helpers

### `loadLocalessSync(origin)`

Injects the Localess Visual Editor sync script into `<head>`. No-op when not in an iframe.

```typescript
import { loadLocalessSync } from "@localess/client";
loadLocalessSync('https://my-localess.web.app');
```

### `localessEditable(content)` and `localessEditableField<T>(fieldName)`

Add attributes recognized by the Localess Visual Editor for click-to-edit.

```tsx
import { localessEditable, localessEditableField } from "@localess/client";

<section {...localessEditable(data)}>
  {/* Adds: data-ll-id (from _id), data-ll-schema (from _schema) */}
  <h1 {...localessEditableField<Page>('title')}>
    {/* Adds: data-ll-field="title" */}
    {data.title}
  </h1>
</section>
```

### Editor Events

```typescript
if (window.localess) {
  window.localess.on(['input', 'change'], (event) => {
    if (event.type === 'input' || event.type === 'change') {
      setPageData(event.data);
    }
  });
  // No .off() method — subscribe once
}
```

| Event         | When                                  |
|---------------|---------------------------------------|
| `input`       | User typing in a field (real-time)    |
| `change`      | Field value confirmed                 |
| `save`        | Content saved                         |
| `publish`     | Content published                     |
| `pong`        | Editor heartbeat response             |
| `enterSchema` | Editor cursor enters a schema block   |
| `hoverSchema` | Editor cursor hovers a schema block   |

## Asset Transform Parameters

| Param       | Type                                    | Description                                                                      |
|-------------|-----------------------------------------|----------------------------------------------------------------------------------|
| `w`         | `number`                                | Width in px. With `h` → cover crop. Without → proportional scale.               |
| `h`         | `number`                                | Height in px. With `w` → cover crop. Without → proportional scale.              |
| `q`         | `number` (1–100)                        | Output quality for JPEG, WebP, AVIF. Ignored for PNG. Default: 85.              |
| `f`         | `'webp' \| 'jpeg' \| 'png' \| 'avif'`  | Convert to this output format.                                                   |
| `download`  | `boolean`                               | `true` → force browser download (`Content-Disposition: form-data`).             |
| `thumbnail` | `boolean`                               | `true` → extract first frame from animated WebP/GIF or video (via FFmpeg).      |

SVG files are always passed through unchanged — `w`, `h`, `f` are ignored for SVG.

## Environment Utilities

```typescript
import { isBrowser, isServer, isIframe } from "@localess/client";

isBrowser()  // true if window is defined
isServer()   // true if window is undefined
isIframe()   // true if running inside an iframe (browser only)
```

## Key Types

```typescript
// Content response wrapper
interface Content<T extends ContentData> extends ContentMetadata {
  data?: T;
  links?: Links;
  references?: References;
  assets?: Assets; // Populated when resolveAsset: true
}

interface Assets { [id: string]: AssetMetadata }
interface AssetMetadata { id: string; name: string; extension: string; type: string; alt?: string }

// Base fields every content object has
interface ContentDataSchema {
  _id: string;
  _schema: string;
}

interface ContentAsset    { kind: 'ASSET'; uri: string }
interface ContentLink     { kind: 'LINK'; type: 'url' | 'content'; target: '_blank' | '_self'; uri: string }
interface ContentRichText { type?: string; content?: ContentRichText[] }  // Tiptap JSON
interface ContentReference { kind: 'REFERENCE'; uri: string }

interface Links        { [contentId: string]: ContentMetadata }
interface Translations { [key: string]: string }
```

## Exports Reference

```typescript
export { localessClient }
export { LocalessApiError }
export { localessEditable, localessEditableField }
export { loadLocalessSync }
export { isBrowser, isServer, isIframe }
export { buildAssetQueryString }
export type {
  LocalessClient, LocalessClientOptions,
  ContentFetchParams, LinksFetchParams, TranslationFetchParams,
  Content, ContentData, ContentDataSchema, ContentDataField,
  ContentMetadata, ContentAsset, ContentLink,
  ContentRichText, ContentReference,
  Links, References, Translations,
  LocalessSync, EventToApp, EventCallback, EventToAppType,
  AssetTransformParams,
}
```

## Common Mistakes

- **Importing in browser code.** Any file that runs in the browser (React Client Component, `useEffect`, client-side bundle) must never import `@localess/client`. Use `@localess/react` hooks or RSC patterns instead.
- **Adding production dependencies.** The package has zero prod deps by design. Never add to `dependencies` in `packages/client/package.json`.
- **Using milliseconds for `cacheTTL`.** `cacheTTL` is in **seconds** (`300` = 5 minutes), not milliseconds.
