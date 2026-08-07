# @localess/react Reference

React integration layer for Localess. Builds on `@localess/client` and adds a component registry, Visual Editor sync, rich text rendering, and asset resolution.

**Peer dependencies:** React 17, 18, or 19 + react-dom.

## Export Variants

`@localess/react` ships three entry points. **Choosing the wrong one is the most common mistake.**

| Import path | Use case | Sync / hooks available |
|---|---|---|
| `@localess/react` | SPA or fully client-rendered app | Yes |
| `@localess/react/ssr` | SSR or Next.js `output: 'export'` (static) | No |
| `@localess/react/rsc` | Next.js App Router (React Server Components) | Yes (via client components) |

### What `@localess/react/ssr` excludes

The smallest bundle. Does NOT include:
- `LocalessDocument` client variant (requires `'use client'`)
- `useLocaless` hook (requires `'use client'`)
- `localessEditable`, `localessEditableField`, `isBrowser`, `isIframe` (browser-only)
- `isSyncEnabled` (not meaningful without sync)
- Sync event types: `LocalessSync`, `EventToApp`, `EventCallback`, `EventToAppType`

### What `@localess/react/rsc` adds back

Extends `/ssr` with:
- `LocalessComponent` client variant
- `isSyncEnabled`
- `LocalessDocument` RSC client variant (handles live sync)
- Re-exports everything from `/ssr`

## Installation

```bash
npm install @localess/react
```

## Initialization

Call `localessInit()` **once** at app startup — in your root layout or `_app.tsx`. Safe in Server Components since it only sets up global state.

```typescript
import { localessInit } from "@localess/react";

localessInit({
  // Required
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,

  // Optional client settings
  version: 'draft',          // undefined = published, 'draft' for preview
  cacheTTL: 300,             // seconds; false to disable; default 300
  fileSystemCache: false,    // true = shared cache across Next.js build workers
  debug: false,

  // React-specific
  enableSync: process.env.NODE_ENV !== 'production',
  components: {
    'page': PageComponent,
    'hero-section': HeroSection,
    'nav-menu': NavMenu,
    'footer': Footer,
  },
  fallbackComponent: UnknownBlock,
});
```

> **Security:** `token` is safe here only because this runs server-side. Never expose it to the browser.

## Component Registry

Maps content `_schema` values to React components. Schema keys must match exactly what is configured in Localess CMS — use lowercase hyphenated names:

```typescript
components: {
  'page': Page,
  'hero-section': Hero,
  'card-grid': CardGrid,
  'rich-text-block': RTE,
}
```

### Dynamic registry management

```typescript
import { registerComponent, unregisterComponent, setComponents, getComponent, setFallbackComponent } from "@localess/react";

registerComponent('promo-banner', PromoBanner);
unregisterComponent('promo-banner');
setComponents({ 'page': Page, 'hero': Hero }); // replaces entire registry
const HeroComp = getComponent('hero');
setFallbackComponent(UnknownBlock);
```

## Rendering Components

### `LocalessComponent` — static renderer

Looks up `data._schema` in the registry and renders the matching component. Server-safe, no sync logic.

```tsx
import { LocalessComponent } from "@localess/react";

<LocalessComponent
  data={content.data}
  links={content.links}
  references={content.references}
/>
```

Rendering logic:
1. Read `data._schema` as registry key
2. Render registered component with `data`, `links`, `references`
3. If not found → try `fallbackComponent`
4. If no fallback → render error message

### `LocalessDocument` — static renderer + live sync

Wraps `LocalessComponent` and subscribes to Visual Editor `input`/`change` events automatically when `enableSync` is active. Does not fetch content — pass server-preloaded data as props.

```tsx
import { getLocalessClient, LocalessDocument } from "@localess/react/rsc";

// Server Component
const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });
return <LocalessDocument document={content} />;
```

### `useLocaless<T>` hook — client fetch + live sync

Fetches content by slug on the client and subscribes to Visual Editor sync events.

```typescript
useLocaless<T extends ContentData = ContentData>(
  slug: string | string[],  // string[] joined with '/' — e.g. ['blog', 'post'] → 'blog/post'
  options?: ContentFetchParams
): Content<T> | undefined
```

Returns `undefined` while the initial fetch is in flight.

### Choosing between the three

| | `LocalessComponent` | `LocalessDocument` | `useLocaless` |
|---|---|---|---|
| Fetches content | No | No | Yes |
| Live sync | No | Yes | Yes |
| Works in RSC | Yes | No (`'use client'`) | No (`'use client'`) |
| Best for | Static SSR | Server-preloaded + sync | SPA / client-rendered |

## Writing Components

Components receive `data`, `links`, and `references` as props. Always spread editable attributes for Visual Editor support:

```tsx
import { localessEditable, localessEditableField, resolveAsset, LocalessComponent } from "@localess/react";
import type { LocalessComponentProps } from "@localess/react";
import type { HeroSection } from "./.localess/localess";

const HeroSection = ({ data, links, references }: LocalessComponentProps<HeroSection>) => (
  <section {...localessEditable(data)}>
    <h1 {...localessEditableField<HeroSection>('title')}>{data.title}</h1>
    {data.image && <img src={resolveAsset(data.image)} alt={data.imageAlt} />}
    {data.cta && <LocalessComponent data={data.cta} links={links} references={references} />}
  </section>
);
```

Pass `links` and `references` through the entire tree — child `LocalessComponent`s need them.

## Visual Editor Sync Patterns

Always preload data server-side and pass it as props — the page renders immediately with no loading flash, then sync activates on top.

### Pattern A — `useLocaless` hook

Re-fetches on client, falls back to server data until ready, auto-syncs.

```tsx
// app/[locale]/page.tsx — Server Component
import { getLocalessClient } from "@localess/react/rsc";
export default async function HomePage({ params }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });
  return <PageClient initialContent={content} locale={locale} />;
}

// app/[locale]/page-client.tsx
'use client';
import { useLocaless, LocalessComponent, localessEditable } from "@localess/react/rsc";

export function PageClient({ initialContent, locale }) {
  const content = useLocaless<Page>('home', { locale }) ?? initialContent;
  return (
    <main {...localessEditable(content.data)}>
      {content.data?.body?.map(item => (
        <LocalessComponent key={item._id} data={item} links={content.links} references={content.references} />
      ))}
    </main>
  );
}
```

### Pattern B — `LocalessDocument` component

No client re-fetch. Uses server data directly. Auto-syncs with editor.

```tsx
// app/[locale]/page.tsx — no separate client file needed
import { getLocalessClient, LocalessDocument } from "@localess/react/rsc";

export default async function HomePage({ params }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });
  return <LocalessDocument document={content} />;
}
```

### Pattern C — Manual

Full control. Initialise state with server data; subscribe to sync events yourself.

```tsx
'use client';
import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, isSyncEnabled, isBrowser } from "@localess/react/rsc";

export function PageClient({ initialContent }) {
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    if (isSyncEnabled() && isBrowser() && window.localess) {
      window.localess.on(['input', 'change'], (event) => {
        if (event.type === 'input' || event.type === 'change') {
          setPageData(event.data);
        }
      });
    }
    // No cleanup — window.localess has no .off() method
  }, []);

  return (
    <main {...localessEditable(pageData)}>
      {pageData?.body?.map(item => (
        <LocalessComponent key={item._id} data={item} links={initialContent.links} references={initialContent.references} />
      ))}
    </main>
  );
}
```

## Utilities

### `findLink(links, link)`

Resolves a `ContentLink` to a URL string.

```typescript
import { findLink } from "@localess/react";
const href = findLink(content.links, data.ctaLink);
// type: 'content' → '/' + fullSlug, or '/not-found' if absent from links map
// type: 'url'     → raw URI
```

### `resolveAsset(asset, params?)`

Converts a `ContentAsset` to a full URL. Configured automatically from `origin` + `spaceId` in `localessInit`.

```typescript
import { resolveAsset } from "@localess/react";
const imageUrl = resolveAsset(data.heroImage);
const imageUrl = resolveAsset(data.heroImage, { w: 800, h: 600, f: 'webp', q: 90 });
const thumb    = resolveAsset(data.video, { w: 400, thumbnail: true });
```

See `AssetTransformParams` table in [docs/client.md](client.md#asset-transform-parameters).

### `renderRichTextToReact(content)`

Converts Localess `ContentRichText` (Tiptap JSON) to a React node tree.

```tsx
import { renderRichTextToReact } from "@localess/react";
<div>{renderRichTextToReact(data.body)}</div>
```

Supported elements: headings (h1–h6), paragraphs, bold, italic, strikethrough, underline, ordered/unordered lists, code, code blocks, links.

## Accessing the Client

```typescript
import { getLocalessClient } from "@localess/react";
const client = getLocalessClient(); // throws if localessInit() not called
```

## Exports Reference

```typescript
// Default export (@localess/react)
export { localessInit, getLocalessClient }
export { registerComponent, unregisterComponent, setComponents, getComponent }
export { setFallbackComponent, getFallbackComponent, isSyncEnabled }
export { LocalessComponent, LocalessDocument }
export { renderRichTextToReact, resolveAsset }
export { useLocaless }
export { findLink }
export { localessEditable, localessEditableField }  // re-exported from @localess/client
export { isBrowser, isServer, isIframe }             // re-exported from @localess/client
export type { LocalessClient, LocalessOptions, LocalessComponentProps }
export type { AssetTransformParams }
export type { Content, ContentData, ContentMetadata, ContentDataSchema, ContentDataField }
export type { ContentAsset, ContentRichText, ContentLink, ContentReference }
export type { Links, References, Translations }
export type { LocalessSync, EventToApp, EventCallback, EventToAppType }

// @localess/react/ssr — excludes sync/hooks (see Export Variants section)
// @localess/react/rsc — extends /ssr with client components and isSyncEnabled
```

## Common Mistakes

- **Wrong import path.** Using `@localess/react` in a Next.js App Router project instead of `@localess/react/rsc` causes `'use client'` directive conflicts. Use `/rsc` for App Router.
- **Using `@localess/react/ssr` when you need sync.** The `/ssr` export deliberately excludes all sync and browser-only code. If you need live Visual Editor editing, use `/rsc`.
- **Calling `localessInit()` in a Client Component.** It is safe in Server Components — call it once in the root layout, never in `'use client'` files.
- **Not passing `links`/`references` down the tree.** Child `LocalessComponent`s need them for resolved data. Always pass them through every level.
- **Enabling sync in production.** `enableSync: process.env.NODE_ENV !== 'production'` — the sync script is only useful inside the Localess editor iframe.
