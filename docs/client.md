# @localess/client Reference

Core JavaScript/TypeScript SDK for the Localess headless CMS.

**Server-side only** — never import it in browser code. A **secret** API token must never reach the browser; use the client in Next.js Server Components, API routes, `getServerSideProps`, Remix loaders, etc. Localess also issues **public tokens** (read-only, published content and translations only) that are safe client-side, but only through a framework package's client-side primitives (currently `@localess/react`, `@localess/angular`, `@localess/vue`, and `@localess/svelte`) — never by importing `@localess/client` directly in the browser. `@localess/cli` and `@localess/astro` are still secret-token-only. → [ADR 001](decisions/001-server-side-only.md)

**Zero external dependencies** — its only dependency is the in-monorepo, itself-zero-dependency `@localess/model` package, whose data-model types it re-exports unchanged. Node.js >= 24.0.0. → [ADR 002](decisions/002-zero-production-deps.md), [ADR 009](decisions/009-shared-model-package.md)

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
  timeoutMs: 15000,                       // Per-attempt timeout in ms; false to disable; default: 15000
  retry: { attempts: 3 },                 // false to disable; default: 3 attempts, 300ms base, 5s cap
  fetch: myFetch,                         // Replacement for the global fetch; default: global fetch
  cache: myCache,                         // Your own ICache; overrides cacheTTL
  fetchInit: { next: { revalidate: 60 } },// Framework fetch options; bypasses the client cache
});
```

Store credentials in environment variables:
```
LOCALESS_ORIGIN=https://my-localess.web.app
LOCALESS_SPACE_ID=your-space-id
LOCALESS_TOKEN=your-api-token
```


## Resilience

Requests retry, time out, and can be cancelled. Defaults are on — a single transient failure
should not fail a build.

| Option | Default | Notes |
|---|---|---|
| `timeoutMs` | `15000` | Per **attempt**, not per call. `false` waits indefinitely. |
| `retry.attempts` | `3` | Includes the first request. `1` or `retry: false` disables retrying. |
| `retry.baseDelayMs` | `300` | Base for exponential backoff. |
| `retry.maxDelayMs` | `5000` | Caps any single delay, including a `Retry-After` the server asks for. |
| `retry.retryStatuses` | `[408, 429, 500, 502, 503, 504]` | Every other 4xx throws immediately. |
| `fetch` | global `fetch` | Injectable, for instrumentation or a runtime-specific implementation. |

**What is retried.** Network failures and the statuses above. A `401` or `403` is thrown straight
away — a bad token will not fix itself, and retrying only delays the error you need to see. All four
fetching methods are `GET`s, so retrying is always idempotent.

**Backoff uses full jitter** — each delay is drawn uniformly from `[0, cap]` rather than being
fixed. That matters when a batch of static-generation workers all start against a cold origin: equal
jitter would still leave them retrying in step.

**`Retry-After` wins.** On a `429` or `503` the server's requested delay is used instead of the
computed backoff, clamped to `maxDelayMs`. Both delta-seconds and HTTP-date forms are accepted; an
unparseable value falls back to backoff.

**Worst-case latency** is roughly `attempts × timeoutMs` plus backoff, since each attempt gets a
fresh timeout. With the defaults that is about 45 seconds against a completely dead origin.

### Cancellation

Every fetching method accepts a `signal`:

```typescript
const controller = new AbortController();
const content = await client.getContentBySlug('home', { signal: controller.signal });
controller.abort();
```

It is composed with the client's own timeout, so whichever fires first wins. Aborting through your
signal is treated as **your decision and is never retried** — unlike a timeout, which is a transient
failure and is.

### Diagnosing failures

Both error types carry `attempts`, and the rendered error box gains an `Attempts` row when a
request was retried, so a log line tells you whether the client gave up after trying:

```typescript
catch (error) {
  if (error instanceof LocalessApiError) {
    console.log(error.status, error.attempts);
  }
}
```


## Caching

Two independent layers, and **only one applies to a given request**.

### The client's own cache

In-memory, per client instance, 5-minute TTL by default. Configure with `cacheTTL` (seconds, or
`false` to disable), or replace it entirely:

```typescript
const client = localessClient({
  ...options,
  cache: {
    async has(key) { return (await redis.exists(key)) === 1; },
    async get(key) { return JSON.parse(await redis.get(key)); },
    async set(key, value) { await redis.set(key, JSON.stringify(value), { EX: 300 }); },
  },
});
```

`ICache` methods may return promises. A supplied cache owns expiry, so `cacheTTL` is ignored.

**Cache keys exclude the token**, so a shared cache instance is shared across tokens. That is safe
for tokens with equal permissions — the API returns the same bytes for a given key, and draft-ness
is part of the key via `version`. **Do not share one cache instance between tokens with different
permissions**: a token lacking `CONTENT_DRAFT` would get a hit on a draft entry another client
stored, rather than the `403` the API would return. Per-client caches are unaffected.

### Framework caching, and the bypass rule

`fetchInit` is merged into every `fetch` call, for frameworks that extend it:

```typescript
const client = localessClient({ ...options, fetchInit: { next: { revalidate: 60 } } });

// or per call
await client.getContentBySlug('home', { fetchInit: { next: { revalidate: 5 } } });
```

**A request carrying `fetchInit` bypasses the client cache entirely** — neither read nor written.
Two caching layers over one call is how content survives a `revalidateTag()` and looks like a bug,
so when the framework has been asked to cache a request, it owns that request.

### Cache tags

When `next` is present and you have not named your own `tags`, the client fills them in:

```
localess                            every request
localess:space:<spaceId>            everything in one space
localess:links                      the link tree
localess:content:<contentId>        one document by id
localess:slug:<fullSlug>            one document by slug
localess:translations:<locale>      one locale's translations
```

So `revalidateTag('localess:slug:home')` works with no bookkeeping. An explicit `tags` array
**replaces** the generated ones rather than merging, so you can opt out.

`localessCacheTags(spaceId, target)` is exported, so a webhook handler can produce the same strings
from the other direction.

## API Methods

### `getContentBySlug<T>(slug, params?)`

```typescript
const content = await client.getContentBySlug<Page>('home', {
  locale: 'en',
  resolveReference: true,  // Populate `references` (one level only)
  resolveLink: true,        // Populate `links` with content metadata
  resolveAsset: true,       // Populate `assets` with asset metadata
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

### `syncScriptUrl()`

```typescript
const url = client.syncScriptUrl();
// https://my-localess.web.app/scripts/sync-v1.js — for manual <script> injection
```

### `findLink(links, link)`

```typescript
import { findLink } from "@localess/client";

const href = findLink(content.links, data.cta);
// type 'content' → '/' + links[uri].fullSlug ('/not-found' when missing or links is undefined)
// type 'url'     → the raw uri
```

## Content Fetch Parameters

| Parameter          | Type                   | Default     | Description                               |
|--------------------|------------------------|-------------|-------------------------------------------|
| `version`          | `'draft' \| undefined` | `undefined` | `'draft'` for preview, omit for published |
| `locale`           | `string`               | —           | ISO 639-1 code: `'en'`, `'de'`, etc.      |
| `resolveReference` | `boolean`              | `false`     | Populate `references` — **one level only** |
| `resolveLink`      | `boolean`              | `false`     | Populate `links` with content metadata    |
| `resolveAsset`     | `boolean`              | `false`     | Populate `assets` with asset metadata     |

### What resolution does and does not do

All three flags are **all-or-nothing** — every id the document uses is resolved, and individual
fields cannot be selected. There is no depth option.

`resolveReference` resolves **one level**. Each entry carries metadata, `locale` and `data`, with
none of its own `references`/`links`/`assets` — raw ids are an internal storage concern and are
stripped, exactly as they are for the top-level document. `References` values are typed as `Content`
(it is a shared type, reused elsewhere), so those three fields are simply always `undefined` here.

Nothing is lost by that: the edges live in `data`. A `REFERENCE` field value is
`{ kind: 'REFERENCE', uri }`, so you follow one by looking its `uri` up in the same map:

```typescript
const authorId = content.data?.author?.uri;
const author = authorId ? content.references?.[authorId] : undefined;
```

`resolveLink` and `resolveAsset` are terminal: they return metadata only, with nothing nested.
`resolveAsset` returns no URL — build one with `assetLink()`.

**Partial failure is silent.** If a referenced document, linked document, or asset has been
deleted, it is omitted from the map and the request still succeeds. A missing key therefore means
"could not resolve", not "not used" — compare against the document's own id list if you need to
tell the two apart.

`getTranslations` takes `TranslationFetchParams` (`version` only). `getLinks` takes `LinksFetchParams`:

| Parameter         | Type                     | Description                                                      |
|-------------------|--------------------------|------------------------------------------------------------------|
| `kind`            | `'DOCUMENT' \| 'FOLDER'` | Filter by content kind (all when omitted)                        |
| `parentSlug`      | `string`                 | Filter to content under this parent slug (e.g. `'legal/policy'`) |
| `excludeChildren` | `boolean`                | `true` → exclude nested sub-slugs                                |

## Error Handling

`getLinks`, `getContentBySlug`, `getContentById`, and `getTranslations` throw instead of returning empty data on failure.

- A non-2xx HTTP response rejects with a `LocalessApiError` — `status`, `statusText`, `url` (token redacted), `body` (the API's parsed response body, if any), and `hint` (a status-specific, human-readable explanation of the likely cause; 401/403 link to `{origin}/features/spaces/{spaceId}/settings/tokens`, and any `message`/`status`/`code`/`details` fields in the body are folded in).
- A failure to reach the API at all (DNS, connection refused, TLS, etc.) rejects with a `LocalessNetworkError` — `origin`, `url` (token redacted), `hint`, and `cause` (the underlying error).
- Both are also logged via `console.error` as a boxed summary before being thrown (ANSI colour only in a TTY, and never when `NO_COLOR` or `NEXT_RUNTIME` is set).

```typescript
import { LocalessApiError, LocalessNetworkError } from "@localess/client";

try {
  const content = await client.getContentBySlug('home');
} catch (error) {
  if (error instanceof LocalessApiError) {
    console.error(`${error.status} ${error.statusText}: ${error.hint}`);
  } else if (error instanceof LocalessNetworkError) {
    console.error(`Could not reach ${error.origin}: ${error.hint}`);
  } else {
    throw error;
  }
}
```

## Caching

Default: in-memory TTL cache, **5 minutes** (300 seconds). Cache key = full request URL. Instance-bound — one cache per `localessClient()` call. The implementations (`TTLCache`, `NoCache`, `Cache`) and the `ICache` interface are exported. → [ADR 003](decisions/003-ttl-cache-design.md)

```typescript
localessClient({ cacheTTL: 60 })    // 1 min — frequently updated content
localessClient({ cacheTTL: 3600 })  // 1 hour — rarely updated content
localessClient({ cacheTTL: false }) // Disabled — always fresh (use in draft/preview mode)
```

## Visual Editor Helpers

### `loadLocalessSync(origin)`

Injects the Localess Visual Editor sync script (`{origin}/scripts/sync-v1.js`) into `<head>`. Returns `Promise<void>` — resolves on load, rejects on load error. Resolves immediately without injecting on the server, when not inside an iframe (with a `console.warn`), or when `window.localess` already exists; concurrent calls share one promise.

```typescript
import { loadLocalessSync } from "@localess/client";
await loadLocalessSync('https://my-localess.web.app');
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
  // `event` is narrowed to the subscribed variant(s) via EventToAppOf<T> — no manual type check needed
  window.localess.on(['input', 'change'], (event) => {
    setPageData(event.data);
  });
  // Shorthand for the same subscription
  window.localess.onChange((event) => setPageData(event.data));
  // No .off() method — subscribe once
}
```

| Event         | Payload                                       | When                                  |
|---------------|-----------------------------------------------|---------------------------------------|
| `input`       | `{ type: 'input', data: any }`                | User typing in a field (real-time)    |
| `change`      | `{ type: 'change', data: any }`               | Field value confirmed                 |
| `save`        | `{ type: 'save' }`                            | Content saved                         |
| `publish`     | `{ type: 'publish' }`                         | Content published                     |
| `unpublish`   | `{ type: 'unpublish' }`                       | Content unpublished                   |
| `pong`        | `{ type: 'pong' }`                            | Editor heartbeat response             |
| `enterSchema` | `{ type: 'enterSchema', id, schema, field? }` | Editor cursor enters a schema block   |
| `hoverSchema` | `{ type: 'hoverSchema', id, schema, field? }` | Editor cursor hovers a schema block   |
| `leaveSchema` | `{ type: 'leaveSchema' }`                     | Editor cursor leaves a schema block   |

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

All data-model types are defined in `@localess/model` and re-exported by `@localess/client`; the full list is in [docs/model.md](model.md).

```typescript
// Content response wrapper
interface Content<T extends ContentData> extends ContentMetadata {
  locale: string; // locale actually served, after any fallback
  data?: T;
  links?: Links;
  references?: References;
  assets?: Assets; // Populated when resolveAsset: true
}

// References reuses Content. What a value carries depends on the endpoint —
// for resolveReference the three collections are always absent. See above.
}

interface ContentMetadata {
  id: string; name: string; kind: 'FOLDER' | 'DOCUMENT';
  slug: string; fullSlug: string; parentSlug: string;
  publishedAt?: string; createdAt: string; updatedAt: string;
}

interface Assets { [id: string]: AssetMetadata }
interface AssetMetadata { id: string; name: string; extension: string; type: string; alt?: string }

// Base fields every content data object has
interface ContentDataSchema {
  _id: string;
  _schema: string;
}

interface ContentAsset    { kind: 'ASSET'; uri: string }
interface ContentLink     { kind: 'LINK'; type: 'url' | 'content'; target: '_blank' | '_self'; uri: string }
interface ContentRichText { type?: string; content?: ContentRichText[] }  // Tiptap JSON
interface ContentReference { kind: 'REFERENCE'; uri: string }

interface Links        { [contentId: string]: ContentMetadata }
interface References   { [contentId: string]: Content }
interface Translations { [key: string]: string }

interface Locale { id: string; name: string }
interface Space  { id: string; name: string; locales: Locale[]; localeFallback: Locale; createdAt: string; updatedAt: string }
```

## Exports Reference

```typescript
export { localessClient }
export { LocalessApiError }
export { LocalessNetworkError }
export { localessEditable, localessEditableField }
export { loadLocalessSync }
export { isBrowser, isServer, isIframe }
export { buildAssetQueryString }
export { findLink }
export { Cache, NoCache, TTLCache }
export type {
  LocalessClient, LocalessClientOptions,
  ContentFetchParams, LinksFetchParams, TranslationFetchParams,
  LocalessSync, EventToApp, EventToAppOf, EventCallback, EventToAppType,
  ICache,
}
// Re-exported from @localess/model (everything it exports):
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

## Common Mistakes

- **Importing in browser code.** Any file that runs in the browser (React Client Component, `useEffect`, client-side bundle) must never import `@localess/client`. Use `@localess/react` hooks or RSC patterns instead. The only browser-safe exports are the token-free helpers (`isBrowser`, `isServer`, `isIframe`, `loadLocalessSync`, `localessEditable`, `localessEditableField`) and the sync event types.
- **Adding production dependencies.** The package has zero external deps by design. Never add anything beyond `@localess/model` to `dependencies` in `packages/client/package.json`.
- **Using milliseconds for `cacheTTL`.** `cacheTTL` is in **seconds** (`300` = 5 minutes), not milliseconds.
