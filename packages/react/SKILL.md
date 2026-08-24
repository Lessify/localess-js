# SKILL: @localess/react

## Overview

`@localess/react` is the **React integration layer** for Localess. It builds on `@localess/client` and adds:

- A **component registry** mapping Localess schema keys to React components
- `<LocalessComponent>` — dynamic content renderer
- **Visual Editor sync** support with editable attributes
- **Rich text** rendering from Tiptap JSON format
- **Asset URL** resolution

**Peer dependencies:** React 17, 18, or 19 + react-dom.

**Export variants:**

| Import path | Use for | Includes `'use client'` code |
|---|---|---|
| `@localess/react` | Plain SPA (CRA, Vite, etc.) | Yes |
| `@localess/react/ssr` | SSR / Next.js `output: 'export'`, when you want the smallest bundle and don't need live editing | No |
| `@localess/react/rsc` | Next.js App Router (React Server Components) | Yes (via client components) |
| `@localess/react/vite` | Vite config for SSR frameworks (TanStack Start, React Router v7, Remix Vite) | N/A — Vite plugin, not a runtime import |

Using `@localess/react` in a Next.js App Router project causes `'use client'` directive conflicts — use `@localess/react/rsc` there instead.

`@localess/react/rsc`'s primary `LocalessDocument` is Server-Action-driven and needs a live server at request time — it works under `default`/`standalone` but not `output: 'export'`. For `output: 'export'` with live editing, use `LocalessClientDocument` (also from `/rsc`) instead, which needs client-side component registration (see `docs/react.md`'s "Client-Side Fallback for Static Export"). Use `/ssr` only when you deliberately want to exclude all sync code.

**`@localess/react/ssr` renames the renderer and document components** — it exports `LocalessServerComponent` / `LocalessServerDocument` in place of `LocalessComponent` / `LocalessDocument`, and does NOT include `useLocaless`, `isSyncEnabled`, `localessSyncOn`, `localessSyncOnChange`, or `localessSyncReady` (none of them are meaningful without live editing). `localessEditable`, `localessEditableField`, `isBrowser`, `isIframe`, and the sync event types ARE still included — they're cheap to bundle and inert outside a client context.

`@localess/react/rsc` re-exports everything from `/ssr` (so `LocalessServerComponent` / `LocalessServerDocument` are available there too) **plus** `LocalessComponent` (server-safe), the primary `LocalessDocument` (a Server Component whose live sync is driven by a Server Action — no client-side registration needed), `LocalessClientDocument` (the `output: 'export'` fallback, needing client-side registration — see `docs/react.md`'s "Client-Side Fallback for Static Export"), `useLocaless`, and the sync functions.

---

## Installation

```bash
npm install @localess/react
```

---

## Initialization

Call `localessInit()` **once** at app startup — in your root layout or `_app.tsx`. This is safe in Server Components since it only sets up global state.

```typescript
import { localessInit } from "@localess/react";

localessInit({
  // Required — same as @localess/client
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,

  // Optional client settings
  version: 'draft',      // undefined = published (default), 'draft' for preview
  cacheTTL: 300,         // Cache TTL in seconds; false to disable; default: 300 (5 min)
  debug: false,

  // React-specific options
  enableSync: process.env.NODE_ENV !== 'production',  // Load Visual Editor sync
  components: {
    'page': PageComponent,
    'hero-section': HeroSection,
    'nav-menu': NavMenu,
    'footer': Footer,
  },
  fallbackComponent: UnknownBlock,  // Rendered when schema has no registered component
});
```

> **Security:** `token` is only safe here because this runs server-side. Never expose it to the browser.

---

## Vite Plugin (SSR Frameworks)

`@localess/react/vite` exports `localess(options)`, a Vite plugin for
TanStack Start / React Router v7 / Remix Vite. It generates two virtual
modules: `virtual:localess-components` (auto-registers every `.tsx`/`.jsx`
file under `componentsDir` by kebab-cased filename, merged with explicit
`components` path overrides — suffix a path with `#ExportName` for a named
export; a bare path assumes a default export) and `virtual:localess-init`
(calls `localessInit()` with `token` identically on both the SSR and client
graphs). See `docs/react.md`'s "Vite Plugin for SSR Frameworks".

> **Known gap:** unlike every other `token` usage in this SKILL, the one
> passed to `localess()` IS shipped to the browser bundle — there is no
> `publicToken`/secret split yet. Treat it as a public value when using this
> plugin.

**Static prerendering (SSG) needs a second, separate `localessClient` for path enumeration — this is expected, not a bug to dedupe.** React Router v7's `ssr: false` + `prerender()` (in `react-router.config.ts`) and TanStack Start's `prerender.pages` (in `vite.config.ts`) both need the list of paths to prerender *before* `localess()`'s virtual modules exist — that config-resolution code runs as plain Node, outside any Vite module graph, so it can't reach the `localessInit()` singleton `getLocalessClient()` reads from. Build its own client instead, importing from `@localess/react/ssr` (never `@localess/client` directly):

```ts
// react-router.config.ts / vite.config.ts — path enumeration only, never bundled
import { localessClient } from '@localess/react/ssr';

const client = localessClient({ origin, spaceId, token });
const links = await client.getLinks({ kind: 'DOCUMENT' });
```

Next.js `output: 'export'` is the one exception: `generateStaticParams()` and the page component are the same route module evaluated once by Next's build, so a single module-level `localessInit()` result can be shared between them — see `docs/react.md`'s "Static Prerendering (SSG): Two Client Instances Are Expected" for the full breakdown per framework.

---

## LocalessComponent

Dynamically renders a Localess content block by looking up its `_schema` in the component registry.

```tsx
import { LocalessComponent } from "@localess/react";

// In a Server Component
<LocalessComponent
  data={content.data}
  links={content.links}
  references={content.references}
/>
```

### Rendering Logic

1. Read `data._schema` as the component registry key
2. Look up registered component by that key
3. If found → render component with `data`, `links`, `references`, `assets`; always injects `data-ll-id` and `data-ll-schema` as props (harmless outside the Visual Editor iframe; user components should spread `{...localessEditable(data)}` on their root element)
4. If not found → try `fallbackComponent`
5. If no fallback → render error message

### Nested Content

Use `LocalessComponent` recursively for nested structures:

```tsx
const Page = ({ data, links, references }) => (
  <main {...localessEditable(data)}>
    {data.sections?.map(section => (
      <LocalessComponent
        key={section._id}
        data={section}
        links={links}
        references={references}
      />
    ))}
  </main>
);
```

---

## Writing Components

Each component receives `data`, `links`, and `references` as props. Always spread editable attributes when Visual Editor sync is enabled.

```tsx
import { localessEditable, localessEditableField, resolveAsset } from "@localess/react";
import type { HeroSection } from "./.localess/localess";

type Props = LocalessComponentProps<HeroSection>;

const HeroSection = ({ data, links, references }: Props) => (
  <section {...localessEditable(data)}>
    <h1 {...localessEditableField<HeroSection>('title')}>
      {data.title}
    </h1>
    <p {...localessEditableField<HeroSection>('subtitle')}>
      {data.subtitle}
    </p>
    {data.image && (
      <img
        src={resolveAsset(data.image)}
        alt={data.imageAlt}
      />
    )}
    {data.cta && (
      <LocalessComponent data={data.cta} links={links} references={references} />
    )}
  </section>
);

export default HeroSection;
```

---

## Editable Attribute Helpers

These add attributes recognized by the Localess Visual Editor for highlighting and inline editing.

```typescript
import { localessEditable, localessEditableField } from "@localess/react";

// On root element of a block — adds data-ll-id and data-ll-schema
<article {...localessEditable(data)} />

// On a specific field — adds data-ll-field="fieldName"
// Generic type T restricts fieldName to valid keys of that content type
<span {...localessEditableField<MyBlock>('description')} />
```

---

## Visual Editor Sync

`localessInit()` is the **single entry point** for Visual Editor integration. Setting `enableSync: true` injects the sync script and enables live event subscription; component registration is independent of it.

### What `enableSync: true` activates

1. Injects the Localess sync script (`loadLocalessSync`) into `<head>`
2. Makes `isSyncEnabled()` — and therefore `useLocaless`, `LocalessDocument`, `localessSyncOn`, `localessSyncOnChange` — actually subscribe to live editor events

`LocalessComponent`'s `data-ll-id` / `data-ll-schema` injection and `localessEditable()` / `localessEditableField()` are unconditional — they always emit their `data-ll-*` attributes regardless of `enableSync`. They're inert outside the Visual Editor iframe, so leaving them on in production is harmless (though sync itself should stay off — see below).

```typescript
localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: process.env.NODE_ENV !== 'production', // only in editor/preview environments
  components: { ... },
});
```

> Never enable sync in production — the script is only meaningful inside the Localess Visual Editor iframe.

### With `useLocaless` Hook

The `useLocaless` hook handles the full cycle automatically — initial fetch and live sync updates — with no extra wiring needed.

```tsx
'use client';

import { useLocaless, LocalessComponent, localessEditable } from "@localess/react/rsc";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent, locale }: { initialContent: Content<Page>; locale?: string }) {
  const content = useLocaless<Page>('home', { locale }) ?? initialContent;

  return (
    <main {...localessEditable(content.data)}>
      {content.data?.body?.map(item => (
        <LocalessComponent
          key={item._id}
          data={item}
          links={content.links}
          references={content.references}
        />
      ))}
    </main>
  );
}
```

### With `LocalessDocument` Component

`LocalessDocument` is a component alternative to the hook. It accepts server-fetched `data` and manages live sync updates internally, delegating rendering to `LocalessComponent`. Useful when you prefer a component-based approach over hooks.

```tsx
// Server Component — pass the fetched content directly to LocalessDocument
import { getLocalessClient, LocalessDocument } from "@localess/react/rsc";
import type { Page } from "./.localess/localess";

export default async function HomePage({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale } = await params;
  const client = getLocalessClient();
  const content = await client.getContentBySlug<Page>('home', { locale });

  return <LocalessDocument document={content} />;
}
```

**Props:**

| Prop       | Type                     | Required | Description                                                            |
|------------|--------------------------|----------|--------------------------------------------------------------------------|
| `document` | `Content<T>`             | ✅        | Full content response object (from `getContentBySlug`/`getContentById`) |
| `ref`      | `React.Ref<HTMLElement>` | ❌        | Forwarded to the rendered root element                                  |

> Subscribes to `input` / `change` events automatically when `enableSync` is active. Unlike `useLocaless`, it does not fetch content — it only handles live sync for data passed in as props.

### Manual Integration

If you manage content state yourself without `useLocaless` or `LocalessDocument`, subscribe to editor events directly via `window.localess`:

```tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, localessSyncOn } from "@localess/react/rsc";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent }: { initialContent: Content<Page> }) {
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    // No-op if sync isn't enabled/usable; `event` is narrowed to the 'input' | 'change' variant
    localessSyncOn(['input', 'change'], (event) => {
      setPageData(event.data);
    });
    // No cleanup needed: window.localess has no .off() method
  }, []);

  return (
    <main {...localessEditable(pageData)}>
      {pageData?.body?.map(item => (
        <LocalessComponent
          key={item._id}
          data={item}
          links={initialContent.links}
          references={initialContent.references}
        />
      ))}
    </main>
  );
}
```

**Available events via `window.localess.on()`:**

| Event         | When                                          |
|---------------|-----------------------------------------------|
| `input`       | User is typing in a field (real-time preview) |
| `change`      | Field value confirmed                         |
| `save`        | Content saved                                 |
| `publish`     | Content published                             |
| `pong`        | Editor heartbeat response                     |
| `enterSchema` | Editor cursor enters a schema block           |
| `hoverSchema` | Editor cursor hovers over a schema block      |

> `window.localess` only exposes `.on()` and `.onChange()` — there is no `.off()`.

`localessSyncOn(event, callback)` wraps `.on()`; `localessSyncOnChange(callback)` wraps `.onChange()` — equivalent to `localessSyncOn(['input', 'change'], callback)`, firing only for content-change events (`callback` receives the `input`/`change` variant, not the full `EventToApp` union). Both handle the `isSyncEnabled()` check and the `localessSyncReady()` wait internally.

### Pattern: Split Server/Client Components (Next.js App Router)

**Preload data server-side** and pass it to the Client Component. The page renders immediately with server data — no loading flash — and Visual Editor sync kicks in on top.

**Server Component** (same for all three options below):

```tsx
// app/[locale]/page.tsx
import { getLocalessClient } from "@localess/react/rsc";
import type { Content, Page } from "./.localess/localess";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  // Data fetched during SSR — preloaded into the client component as a prop
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  return <PageClient initialContent={content} locale={locale} />;
}
```

**Option A — `useLocaless` hook**: re-fetches on client, falls back to server data until resolved, auto-syncs with editor.

```tsx
// app/[locale]/page-client.tsx
'use client';

import { useLocaless, LocalessComponent, localessEditable } from "@localess/react/rsc";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent, locale }: { initialContent: Content<Page>; locale?: string }) {
  // ?? initialContent: renders server data immediately, switches to hook result once ready
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

**Option B — `LocalessDocument` component**: no client re-fetch, uses server data directly, auto-syncs with editor.

```tsx
// app/[locale]/page.tsx — no separate client file needed
import { getLocalessClient, LocalessDocument } from "@localess/react/rsc";
import type { Page } from "./.localess/localess";

export default async function HomePage({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  return <LocalessDocument document={content} />;
}
```

**Option C — Manual**: full control, initialise state with server-preloaded data, subscribe to sync yourself.

```tsx
// app/[locale]/page-client.tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, localessSyncOn } from "@localess/react/rsc";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent }: { initialContent: Content<Page> }) {
  // Server-preloaded data used as initial state — no loading flash
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    // No-op if sync isn't enabled/usable; `event` is narrowed to the 'input' | 'change' variant
    localessSyncOn(['input', 'change'], (event) => {
      setPageData(event.data);
    });
    // No cleanup needed: window.localess has no .off() method
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

---

## Static Rendering (No Live Editing)

For Next.js `output: 'export'` or any SSR context where Visual Editor sync isn't needed, use `@localess/react/ssr` and its `LocalessServerComponent` / `LocalessServerDocument` instead of the default (sync-capable) `LocalessComponent` / `LocalessDocument`. This is the smallest bundle — it excludes `useLocaless` and every sync function entirely. If you *do* want live editing on a statically-exported build, use `@localess/react/rsc`'s `LocalessClientDocument` instead — see `docs/react.md`'s "Client-Side Fallback for Static Export" section for the registration step it requires.

```tsx
import { getLocalessClient, LocalessServerDocument } from "@localess/react/ssr";
import type { Page } from "./.localess/localess";

export default async function HomePage({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  return <LocalessServerDocument document={content} />;
}
```

`LocalessServerComponent` is the equivalent of `LocalessComponent` for this export — same schema-lookup and fallback behavior, no `data-ll-*` sync attributes:

```tsx
import { LocalessServerComponent } from "@localess/react/ssr";

<LocalessServerComponent data={content.data} links={content.links} references={content.references} />
```

> Reach for `@localess/react/rsc` instead if you need live Visual Editor editing on top of Server Components — it re-exports everything from `/ssr` plus the sync-capable `LocalessComponent` / `LocalessDocument`, `useLocaless`, and the sync functions.

---

## `useLocaless` Hook

`useLocaless<T>` fetches content by slug on the client side and automatically wires up Visual Editor live updates when `enableSync` is active.

```tsx
'use client';

import { useLocaless } from "@localess/react";
import type { Page } from "./.localess/localess";

export function PageView({ slug }: { slug: string }) {
  const content = useLocaless<Page>(slug, { locale: 'en' });

  if (!content) return <div>Loading…</div>;

  return (
    <main>
      {content.data.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={content.links} />
      ))}
    </main>
  );
}
```

### Signature

```typescript
useLocaless<T extends ContentData = ContentData>(
  slug: string | string[],  // string[] is joined with '/' — e.g. ['blog', 'post'] → 'blog/post'
  options?: ContentFetchParams
): Content<T> | undefined
```

- Returns `undefined` while the initial fetch is in flight.
- When `enableSync` is active and the page is inside the Localess Visual Editor, automatically subscribes to `input` / `change` events and updates the returned value in place.

---

## Link Utilities

### `findLink(links, link)`

Resolves a `ContentLink` to a URL string. Use this to convert link fields from Localess content into href values.

```typescript
import { findLink } from "@localess/react";

const href = findLink(content.links, data.ctaLink);
// type: 'content' → '/' + fullSlug (e.g. '/blog/my-post'), or '/not-found' if not in links map
// type: 'url'     → raw URI (e.g. 'https://example.com')
```

```tsx
const NavLink = ({ data, links }) => (
  <a href={findLink(links, data.link)}>{data.label}</a>
);
```

---

## Rich Text Rendering

Converts Localess `ContentRichText` (Tiptap JSON) to a React node tree.

```tsx
import { renderRichTextToReact } from "@localess/react";

const Article = ({ data }) => (
  <article>
    <h1>{data.title}</h1>
    <div>{renderRichTextToReact(data.body)}</div>
  </article>
);
```

**Supported elements:** headings (h1–h6), paragraphs, bold, italic, strikethrough, underline, ordered/unordered lists, code, code blocks, links.

---

## Asset Resolution

```typescript
import { resolveAsset } from "@localess/react";
import type { AssetTransformParams } from "@localess/react";

// ContentAsset → full URL (no transform)
const imageUrl = resolveAsset(data.heroImage);
// Returns: https://my-localess.web.app/api/v1/spaces/{spaceId}/assets/{uri}

// With transform params
const imageUrl = resolveAsset(data.heroImage, { w: 800, h: 600, f: 'webp', q: 90 });
// Returns: .../assets/{uri}?w=800&h=600&q=90&f=webp

// Thumbnail from video/animated image
const thumb = resolveAsset(data.video, { w: 400, thumbnail: true });
```

Set up automatically during `localessInit()` from `origin` + `spaceId`.

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

## Component Registry Management

For dynamic/lazy registration (e.g., plugin systems):

```typescript
import {
  registerComponent,
  unregisterComponent,
  setComponents,
  getComponent,
  setFallbackComponent,
  getFallbackComponent,
} from "@localess/react";

registerComponent('promo-banner', PromoBanner);
unregisterComponent('promo-banner');
setComponents({ 'page': Page, 'hero': Hero }); // replaces entire registry
const HeroComp = getComponent('hero');
setFallbackComponent(UnknownBlock);
```

---

## Accessing the Client

In Server Components, access the initialized client directly:

```typescript
import { getLocalessClient } from "@localess/react/rsc";

const client = getLocalessClient(); // throws if localessInit() not called
const [content, translations] = await Promise.all([
  client.getContentBySlug<Page>('home', { locale: 'en', resolveReference: true }),
  client.getTranslations('en'),
]);
```

For a standalone build-time script that needs its own client instance outside the `localessInit()`/`getLocalessClient()` singleton lifecycle — e.g. a `vite.config.ts` or `react-router.config.ts` enumerating static-prerender paths before any app graph exists — import the raw factory from `@localess/react/ssr`, never from `@localess/client` directly:

```typescript
// vite.config.ts / react-router.config.ts — build-time only, never bundled
import { localessClient } from "@localess/react/ssr";

const client = localessClient({ origin, spaceId, token });
const links = await client.getLinks({ kind: "DOCUMENT" });
```

> **Never import `@localess/client` directly in consumer code (playgrounds, docs, examples).** `@localess/client` is an implementation detail of `@localess/react`. If something you need isn't re-exported yet, add it to `src/index.ts` (SPA export) or `src/ssr/index.ts` (server-only export) — don't reach past `@localess/react`.

---

## Full Next.js 16.2 App Router Setup

```typescript
// app/layout.tsx (Server Component)
import { localessInit } from "@localess/react/rsc";
import { Page, HeroSection, NavMenu, Footer } from "@/components/localess";

localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: process.env.NODE_ENV !== 'production',
  components: {
    'page': Page,
    'hero-section': HeroSection,
    'nav-menu': NavMenu,
    'footer': Footer,
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

---

## Schema Key Convention

Schema keys must match exactly what is configured in Localess CMS settings. Use lowercase hyphenated names:

```typescript
components: {
  'page': Page,             // _schema === 'page'
  'hero-section': Hero,     // _schema === 'hero-section'
  'card-grid': CardGrid,    // _schema === 'card-grid'
  'rich-text-block': RTE,   // _schema === 'rich-text-block'
}
```

---

## Best Practices

1. **Call `localessInit()` once** in root layout — never in individual page components.

2. **Disable sync in production**: `enableSync: process.env.NODE_ENV !== 'production'` — the sync script is only useful inside the Localess editor.

3. **Always use generated types** (`localess types generate`) for full `data` type safety in components.

4. **Use `localessEditable` on every block root element** and `localessEditableField` on key editable fields so editors can click-to-edit.

5. **Pass `links` and `references` through the tree** — child `LocalessComponent`s need them for resolved data.

6. **Use `resolveAsset()` instead of manually constructing asset URLs** — the format may change between versions.

7. **Fetch data server-side only** — `getLocalessClient()` in React Server Components, API routes, or loaders. Never in `useEffect` or client components.

---

## Exports Reference

```typescript
// Default export (@localess/react)

// Initialization & client
export { localessInit, getLocalessClient }

// Component registry
export { registerComponent, unregisterComponent, setComponents, getComponent }
export { setFallbackComponent, getFallbackComponent, isSyncEnabled, localessSyncOn, localessSyncOnChange, localessSyncReady }

// Rendering
export { LocalessComponent }        // Dynamic schema-to-component renderer
export { LocalessDocument }         // Schema renderer + built-in Visual Editor sync ('use client')
export { renderRichTextToReact }    // Rich text → React nodes
export { resolveAsset }             // ContentAsset → full URL

// Hooks
export { useLocaless }              // Client-side content fetching with sync support

// Utilities
export { findLink }                 // ContentLink → URL string

// Visual editor (re-exported from @localess/client)
export { localessEditable, localessEditableField }

// Environment utilities (re-exported from @localess/client)
export { isBrowser, isServer, isIframe }

// Error handling (re-exported from @localess/client)
export { LocalessApiError }         // Thrown by getContentBySlug/getContentById on a non-2xx response; check .status

// Types (re-exported from @localess/client + local)
export type { AssetTransformParams }            // Image transform params for resolveAsset
export type { LocalessClient, LocalessOptions }
export type { LocalessSync, EventToApp, EventToAppOf, EventCallback, EventToAppType }
export type {
  Content, ContentData, ContentMetadata, ContentDataSchema, ContentDataField,
  ContentAsset, ContentRichText, ContentLink, ContentReference,
  Links, References, Translations,
}
```

```typescript
// @localess/react/ssr — smallest bundle, no sync, no 'use client'
export { localessInit, getLocalessClient }
export { registerComponent, unregisterComponent, getComponent, getFallbackComponent }
export { LocalessServerComponent }  // Dynamic schema-to-component renderer, server-safe
export { LocalessServerDocument }   // Schema renderer, no sync — server-safe
export { renderRichTextToReact, resolveAsset, findLink }
export { localessEditable, localessEditableField, isBrowser, isServer, isIframe }
export { LocalessApiError }
// Same shared types as the default export, minus anything sync-specific being meaningful

// @localess/react/rsc — everything from /ssr, plus:
export { LocalessComponent }        // server-safe here (no 'use client')
export { LocalessDocument }         // primary: Server Component, Server-Action-driven live sync, no client-side registration
export { LocalessClientDocument }   // fallback for output: 'export'; same 'use client' component as the default export; needs client-side registration (see docs/react.md)
export { useLocaless }              // requires 'use client'
export { isSyncEnabled, localessSyncOn, localessSyncOnChange, localessSyncReady }
```
