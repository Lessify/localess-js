# SKILL: @localess/client

## Overview

`@localess/client` is the **core JavaScript/TypeScript SDK** for the Localess headless CMS. It is a **server-side-only** library — never import it in browser/client-side code. A **secret** API token must never be exposed client-side. Localess also issues **public tokens** (read-only, published content and translations only) that are safe client-side, but only through a framework package's own client-side primitives (currently `@localess/react`, `@localess/angular`, `@localess/vue`, and `@localess/svelte`) — never by importing `@localess/client` in the browser. `@localess/cli` and `@localess/astro` have not been reworked for public tokens; treat their token as secret-only.

**Zero external dependencies** — its only dependency is the in-monorepo, itself-zero-dependency `@localess/model` package, whose data-model types (`Content`, `ContentAsset`, `ContentLink`, `Locale`, `Space`, `Translations`, …) it re-exports unchanged. Requires Node.js >= 24.0.0.

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
  timeoutMs: 15000,                       // Per-attempt timeout in ms; false to disable; default: 15000
  retry: { attempts: 3 },                 // false to disable; default: 3 attempts, 300ms base, 5s cap
  fetch: myFetch,                         // Replacement for the global fetch; default: global fetch
  cache: myCache,                         // Your own ICache; overrides cacheTTL
  fetchInit: { next: { revalidate: 60 } },// Framework fetch options; bypasses the client cache
});
```

---

## API Methods

### Fetch Content by Slug

```typescript
const content = await client.getContentBySlug<Page>('home', {
  locale: 'en',
  resolveReference: true,  // Populate `references` (ONE level only)
  resolveLink: true,        // Populate `links` with content metadata
  resolveAsset: true,       // Populate `assets` with asset metadata
  version: 'draft',         // Override client default per-request
});
// content.data is typed as Page
// content.assets is populated when resolveAsset: true
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

// The query-string serialiser is exported standalone
import { buildAssetQueryString } from "@localess/client";
buildAssetQueryString({ w: 800, download: true }); // 'w=800&download'
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

### Sync Script URL

```typescript
const url = client.syncScriptUrl();
// Returns: https://my-localess.web.app/scripts/sync-v1.js — for manual <script> injection
```

### Resolve a ContentLink

```typescript
import { findLink } from "@localess/client";

const href = findLink(content.links, data.cta);
// type 'content' → '/' + links[uri].fullSlug ('/not-found' when missing or links is undefined)
// type 'url'     → the raw uri
```

---

## Content Fetch Parameters (`ContentFetchParams`)

| Parameter          | Type                   | Default     | Description                               |
|--------------------|------------------------|-------------|-------------------------------------------|
| `version`          | `'draft' \| undefined` | `undefined` | `'draft'` for preview, omit for published |
| `locale`           | `string`               | —           | ISO 639-1 code: `'en'`, `'de'`, etc.      |
| `resolveReference` | `boolean`              | `false`     | Populate `references` — **one level only** |
| `resolveLink`      | `boolean`              | `false`     | Populate `links` with content metadata    |
| `resolveAsset`     | `boolean`              | `false`     | Populate `assets` with asset metadata     |

Resolution is **all-or-nothing** (no per-field selection) and has **no depth option**.
`resolveReference` resolves one level: each entry carries metadata, `locale` and `data`, with none
of its own collections — the API strips those id arrays, so on a `References` value they are always
`undefined`. Follow a further reference via the `uri` on the `REFERENCE` field value in `data`. `resolveLink`/`resolveAsset` are terminal metadata only; `resolveAsset`
returns no URL — use `assetLink()`.
A deleted target is **silently omitted** from the map and the request still succeeds, so a missing
key means "could not resolve", not "not used".

## Translation Fetch Parameters (`TranslationFetchParams`)

| Parameter | Type                   | Default     | Description                               |
|-----------|------------------------|-------------|-------------------------------------------|
| `version` | `'draft' \| undefined` | `undefined` | `'draft'` for preview, omit for published |

## Links Fetch Parameters (`LinksFetchParams`)

| Parameter         | Type                     | Default | Description                                                          |
|-------------------|--------------------------|---------|----------------------------------------------------------------------|
| `kind`            | `'DOCUMENT' \| 'FOLDER'` | all     | Filter by content kind                                               |
| `parentSlug`      | `string`                 | —       | Filter to content under this parent slug (e.g. `'legal/policy'`)     |
| `excludeChildren` | `boolean`                | `false` | `true` → exclude nested sub-slugs, only direct children of the parent |

---

## Error Handling

`getLinks`, `getContentBySlug`, `getContentById`, and `getTranslations` throw instead of returning empty/default data on failure:

- Non-2xx HTTP responses (401, 404, 500, ...) reject with a `LocalessApiError` exposing `status`, `statusText`, `url` (token redacted), `body` (the API's parsed response body, if present), and `hint` (a status-specific explanation of the likely cause and what to check). When the response body has a `message` and/or a `status`/`code` field (e.g. `{ message: 'Draft content requires DRAFT permission', status: 'PERMISSION_DENIED' }`), both are folded into `hint` and printed in the console error box — inspect `error.body` directly for the raw values. On 401/403, `hint` also links to that space's token settings screen (`{origin}/features/spaces/{spaceId}/settings/tokens`) so you can check the token directly. When the body carries a `details` object (`{ reason, hint, requiredPermissions }` — typically on 403, e.g. explaining that a `version=draft` query param requires a permission the token doesn't have), it is also folded into `hint` and given its own `Reason`/`Required` rows in the console error box.
- Failures before a response is received (DNS, connection refused, TLS, ...) reject with a `LocalessNetworkError` exposing `origin`, `url` (redacted), `hint`, and `cause` (the underlying error).
- Both errors are also logged as a boxed, human-readable summary via `console.error`. Colors are skipped (even in a TTY) when `NEXT_RUNTIME` is set, since Next.js dev mode mirrors server console output into the browser's error overlay verbatim, ANSI codes and all.

```typescript
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

Always wrap calls in `try`/`catch` (or handle rejection) — the promise never silently resolves to `{}` on failure.

---

## Caching

- Default: in-memory TTL cache, **5 minutes** (300,000 ms)
- Cache key = full request URL (includes all parameters)
- `cacheTTL: false` always disables caching, regardless of other options
- Implementations are exported: `TTLCache` (default; expired entries are dropped on access), `NoCache` (used for `cacheTTL: false`), and a plain unbounded `Cache`, all implementing `ICache<V>` (`set`/`get`/`has`)

### Resilience

Retries, timeouts and cancellation are **on by default**.

| Option | Default | Notes |
|---|---|---|
| `timeoutMs` | `15000` | Per attempt. `false` disables. |
| `retry.attempts` | `3` | Includes the first request. `1` or `retry: false` disables. |
| `retry.baseDelayMs` | `300` | Exponential backoff base. |
| `retry.maxDelayMs` | `5000` | Caps any delay, including `Retry-After`. |
| `retry.retryStatuses` | `[408, 429, 500, 502, 503, 504]` | Other 4xx throw immediately. |
| `fetch` | global | Injectable replacement. |

- Retried: network failures and the statuses above. **Not** retried: `401`, `403`, `404` — they will not fix themselves.
- Backoff uses **full jitter**; `Retry-After` (seconds or HTTP-date) overrides it, clamped to `maxDelayMs`.
- Every fetching method takes `signal?: AbortSignal`, composed with the timeout. A caller abort is **never retried**; a timeout is.
- `LocalessApiError` and `LocalessNetworkError` both carry `attempts`.
- Worst case is roughly `attempts × timeoutMs` plus backoff — each attempt gets a fresh timeout.

### Pluggable cache and framework caching

- `cache?: ICache<unknown>` replaces the built-in cache; methods may return promises. A supplied cache owns expiry, so `cacheTTL` is ignored.
- **Cache keys exclude the token.** A shared cache instance is therefore shared across tokens — safe for equal permissions, **not** safe between tokens with different ones.
- `fetchInit?: { next?: { revalidate?, tags? }, cache?: RequestCache }` on the client and per call, shallow-merged.
- **A request carrying `fetchInit` bypasses the client cache entirely** — neither read nor written. The framework owns that request.
- When `next` is set without `tags`, these are generated: `localess`, `localess:space:<spaceId>`, then one of `localess:links`, `localess:content:<id>`, `localess:slug:<fullSlug>`, `localess:translations:<locale>`. An explicit `tags` array replaces them.
- `localessCacheTags(spaceId, target)` is exported for producing the same strings in a webhook handler.

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
await loadLocalessSync('https://my-localess.web.app');
// Injects {origin}/scripts/sync-v1.js into <head>; returns Promise<void> that resolves on load (rejects on load error).
// Resolves immediately without injecting on the server, when not inside an iframe (console.warn), or when window.localess already exists.
// Concurrent calls share one promise (safe under React Strict Mode double effects).
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

All data-model types are defined in `@localess/model` and re-exported by `@localess/client` — import them from either package.

```typescript
// Content response wrapper
interface Content<T extends ContentData> extends ContentMetadata {
  locale: string; // locale actually served, after any fallback
  data?: T;
  links?: Links;
  references?: References;
  assets?: Assets; // Populated when resolveAsset: true
}

// Resolved asset metadata, keyed by asset id
interface Assets {
  [id: string]: AssetMetadata;
}

interface AssetMetadata {
  id: string;
  name: string;
  extension: string;
  type: string;
  alt?: string;
}

// Content metadata (also the value type of Links)
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

// Space and locale (used by @localess/cli; not fetched by this client)
interface Locale { id: string; name: string }
interface Space {
  id: string;
  name: string;
  locales: Locale[];
  localeFallback: Locale;
  createdAt: string;
  updatedAt: string;
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

1. **Never import `@localess/client` in browser bundles.** Use it only in server-side code: Next.js Server Components, API routes, `getServerSideProps`, Remix loaders, etc. If you need client-side access with a public (read-only) token, use the framework package's client-side primitives (`@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`) instead. The only browser-safe exports here are the token-free helpers: `isBrowser`, `isServer`, `isIframe`, `loadLocalessSync`, `localessEditable`, `localessEditableField`, and the sync event types.

2. **Store credentials in environment variables**, not hardcoded:
   ```
   LOCALESS_ORIGIN=https://my-localess.web.app
   LOCALESS_SPACE_ID=your-space-id
   LOCALESS_TOKEN=your-api-token
   ```

3. **Create one client instance** and reuse it — the cache is instance-bound.

4. **Use generated types** from `@localess/cli` (`localess type generate`) for full type safety:
   ```typescript
   import type { Page } from './.localess/localess';
   const content = await client.getContentBySlug<Page>('home');
   ```

5. **Use `version: 'draft'` and `cacheTTL: false` for preview/editing** environments.

6. **Use `resolveReference: true`** only when you need inline reference data — it increases payload size.

7. **Always wrap fetch calls in `try`/`catch`** — they throw on network failure or non-2xx responses instead of returning empty data.

---

## Exports Reference

```typescript
export { localessClient }                          // Client factory
export { LocalessApiError }                        // Thrown for non-2xx API responses (status, statusText, url, body, hint)
export { LocalessNetworkError }                    // Thrown when the API can't be reached (origin, url, hint, cause)
export { localessEditable, localessEditableField } // Visual editor helpers
export { loadLocalessSync }                        // Sync script injector
export { isBrowser, isServer, isIframe }           // Environment utilities
export { buildAssetQueryString }                   // Asset query string serialiser
export { findLink }                                // Resolves a ContentLink against a Links map
export { Cache, NoCache, TTLCache }                 // Cache implementations (ICache) backing `cacheTTL`
export type {
  LocalessClient, LocalessClientOptions,
  ContentFetchParams, LinksFetchParams, TranslationFetchParams,
  LocalessSync, EventToApp, EventToAppOf, EventCallback, EventToAppType,
  ICache,
}
// Re-exported from @localess/model (every type it exports):
export type {
  Content, ContentData, ContentDataSchema, ContentDataField,
  ContentMetadata, ContentAsset, ContentLink,
  ContentRichText, ContentReference,
  Links, References, Assets, AssetMetadata, AssetTransformParams,
  Translations, Locale, Space,
  SchemaType, SchemaFieldKind, AssetFileType, SchemaEnumValue,
  SchemaFieldBase, SchemaField /* + the 18 SchemaField* interfaces */,
  SchemaComponentExport, SchemaEnumExport, SchemaExport,
}
```

`window.localess?: LocalessSync` is also declared on the global `Window` interface.
