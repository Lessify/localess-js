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

| Import path | Use for | Browser-only code |
|---|---|---|
| `@localess/react` | Plain SPA (CRA, Vite, etc.) | Yes — `LocalessDocument` / `useLocaless` call React hooks and must run inside a Client Component boundary (no `'use client'` directive is shipped; the consumer's file declares it) |
| `@localess/react/ssr` | SSR / Next.js `output: 'export'`, when you want the smallest bundle and don't need live editing | No |
| `@localess/react/rsc` | Next.js App Router (React Server Components) | Yes — ships one `'use client'` listener island rendered by its `LocalessDocument`, plus `useLocaless` |
| `@localess/react/vite` | Vite config for SSR frameworks (TanStack Start, React Router v7, Remix Vite) | N/A — Vite plugin, not a runtime import |
| `@localess/react/vite/virtual-modules` | tsconfig `types` entry declaring the plugin's `virtual:localess-init` / `virtual:localess-components` modules | N/A — ambient `.d.ts` only |

In a Next.js App Router project use `@localess/react/rsc`: the default export's `LocalessDocument` and `useLocaless` call React hooks, so rendering them directly from a Server Component fails — `/rsc` provides a Server Component `LocalessDocument` instead.

`@localess/react/rsc`'s `LocalessDocument` is Server-Action-driven and needs a live server at request time — it works under `default`/`standalone` but not `output: 'export'`. For `output: 'export'` with live editing, render the default export's client-side `LocalessDocument` (`import { LocalessDocument } from "@localess/react"`) inside a `'use client'` file instead; it needs a second, client-side `localessInit()` with a public token (see `docs/react.md`'s "Client-Side Fallback for Static Export"). Use `/ssr` only when you deliberately want to exclude all sync code.

**`@localess/react/ssr` renames the renderer and document components** — it exports `LocalessServerComponent` / `LocalessServerDocument` in place of `LocalessComponent` / `LocalessDocument`, and does NOT include `useLocaless`, `isSyncEnabled`, `localessSyncOn`, `localessSyncOnChange`, or `localessSyncReady` (none of them are meaningful without live editing). `localessEditable`, `localessEditableField`, `isBrowser`, `isIframe`, and the sync event types ARE still included — they're cheap to bundle and inert outside a client context. `/ssr` additionally re-exports `localessClient`, the raw client factory, for build-time scripts (see "Accessing the Client").

`@localess/react/rsc` re-exports everything from `/ssr` (so `LocalessServerComponent` / `LocalessServerDocument` and `localessClient` are available there too) **plus** `LocalessComponent` (server-safe), its own `LocalessDocument` (a Server Component whose live sync is driven by a Server Action — no client-side registration needed), `useLocaless`, and the sync functions (`isSyncEnabled`, `localessSyncOn`, `localessSyncOnChange`, `localessSyncReady`). It does **not** export the default export's client-side `LocalessDocument` or `isSyncConfigured`.

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

> **Security:** a secret `token` is only safe here because this runs server-side. Never expose it to the browser. The one client-side exception is a Localess **public token** (read-only, published content and translations only) passed to a second `localessInit()` inside a Client Component — see "Static Rendering" below and `docs/react.md`'s "Client-Side Fallback for Static Export".

`localessInit` returns the created `LocalessClient`. `components` / `fallbackComponent` are typed `AnyLocalessComponent` (= `React.ComponentType<LocalessSchemaProps<any>>`), so any component typed with `LocalessSchemaProps<SomeSchema>` is accepted.

---

## Vite Plugin (SSR Frameworks)

`@localess/react/vite` exports `localess(options): Plugin[]`, a Vite plugin for
TanStack Start / React Router v7 / Remix Vite, plus the `LocalessOptions`
(plugin options) and `LocalessInitOptions` types. Options: `origin`, `spaceId`,
`token` (all required — `localess()` throws if any is missing); optional
`version: 'draft'`, `cacheTTL`, `debug`, `enableSync` (forwarded to
`localessInit`); `componentsDir` (default `'src'`); and `components`
(`Record<schemaKey, path>`, paths relative to `componentsDir`). It generates two virtual
modules: `virtual:localess-components` (auto-registers every `.tsx`/`.jsx`
file under `componentsDir` by kebab-cased filename, merged with explicit
`components` path overrides — suffix a path with `#ExportName` for a named
export; a bare path assumes a default export; overrides win on key collision)
and `virtual:localess-init` (imports `localessInit` from `@localess/react` and
calls it with `token` and the merged registry, identically on both the SSR and
client graphs). Import `'virtual:localess-init'` once in your app, and add
`"@localess/react/vite/virtual-modules"` to tsconfig `compilerOptions.types` so
that import type-checks. See `docs/react.md`'s "Vite Plugin for SSR Frameworks".

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

Each component receives `data`, `links`, `references`, and `assets` as props (`LocalessSchemaProps<T>`). Always spread editable attributes when Visual Editor sync is enabled.

```tsx
import { LocalessComponent, localessEditable, localessEditableField, resolveAsset } from "@localess/react";
import type { LocalessSchemaProps } from "@localess/react";
import type { HeroSection } from "./.localess/localess";

type Props = LocalessSchemaProps<HeroSection>;

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

`LocalessDocument` is a component alternative to the hook. It accepts the server-fetched `Content` object as `document` and manages live sync internally, delegating rendering to `LocalessComponent`. There are two implementations. `@localess/react/rsc`'s is a Server Component: it renders `LocalessComponent` server-side (overlaying any pending edit from the in-process live-edit cache) plus a hidden `'use client'` listener that forwards `input` / `change` / `save` / `publish` / `unpublish` events to a Server Action, which updates the cache and calls `revalidatePath`. The default export's (`@localess/react`) is a client-side component holding `document.data` in `useState` and subscribing to `input` / `change` via `localessSyncOnChange`; render it inside a `'use client'` file.

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

> Live sync only activates when `enableSync: true` was passed to `localessInit` and the page runs inside the Visual Editor iframe. Unlike `useLocaless`, it does not fetch content — it only handles live sync for data passed in as props. The `/rsc` version needs a live server at request time (not `output: 'export'`).

### Manual Integration

If you manage content state yourself without `useLocaless` or `LocalessDocument`, subscribe to editor events with `localessSyncOn` (a wrapper over `window.localess.on`):

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
| `unpublish`   | Content unpublished                           |
| `pong`        | Editor heartbeat response                     |
| `enterSchema` | Editor cursor enters a schema block           |
| `hoverSchema` | Editor cursor hovers over a schema block      |
| `leaveSchema` | Editor cursor leaves a schema block           |

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

For Next.js `output: 'export'` or any SSR context where Visual Editor sync isn't needed, use `@localess/react/ssr` and its `LocalessServerComponent` / `LocalessServerDocument` instead of the default (sync-capable) `LocalessComponent` / `LocalessDocument`. This is the smallest bundle — it excludes `useLocaless` and every sync function entirely. If you *do* want live editing on a statically-exported build, render the default export's client-side `LocalessDocument` (from `@localess/react`) inside a `'use client'` file, after a second `localessInit()` there with a **public token** — see `docs/react.md`'s "Client-Side Fallback for Static Export" section for the registration step it requires.

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

`useLocaless<T>` fetches content by slug on the client side (via `getLocalessClient()`, so the `localessInit()` it relies on runs in the browser and must use a public token) and automatically wires up Visual Editor live updates when `enableSync` is active.

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
  options?: UseLocalessOptions   // = ContentFetchParams (locale, version, resolveReference, resolveLink)
): Content<T> | undefined
```

- Returns `undefined` while the initial fetch is in flight, or if it failed (the error is logged to the console).
- `options` is compared by value (JSON), so an inline object literal does not re-trigger the fetch on every render.
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

Converts Localess `ContentRichText` (Tiptap JSON) to a native React node tree — built on `@localess/richtext`, no TipTap at runtime, safe in SPA/SSR/RSC.

```tsx
import { LocalessRichText, renderRichText } from "@localess/react";

const Article = ({ data }) => (
  <article>
    <h1>{data.title}</h1>
    <LocalessRichText content={data.body} />
  </article>
);
```

Per-node/per-mark overrides are React components receiving the node's fields plus `children`:

```tsx
<LocalessRichText
  content={data.body}
  renderers={{ link: ({ attrs, children }) => <Link href={attrs.href}>{children}</Link> }}
/>
```

`renderRichText(content, options?)` is the function form returning `ReactNode`.

**Supported elements:** headings (h1–h6), paragraphs, bold, italic, strikethrough, underline, ordered/unordered lists, code, code blocks, links. Link `href`s pass a protocol allowlist (`javascript:`/`data:` stripped). Unknown node types are skipped with a dev-only warning unless a renderer for that type string is provided.

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

The registry (and fallback component) are set via `localessInit`'s `components`/`fallbackComponent` options — calling `localessInit` again replaces the registry entirely. Use `getComponent`/`getFallbackComponent` to read it:

```typescript
import { getComponent, getFallbackComponent } from "@localess/react";

const HeroComp = getComponent('hero');
const fallback = getFallbackComponent();
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

3. **Always use generated types** (`localess type generate`) for full `data` type safety in components.

4. **Use `localessEditable` on every block root element** and `localessEditableField` on key editable fields so editors can click-to-edit.

5. **Pass `links` and `references` through the tree** — child `LocalessComponent`s need them for resolved data.

6. **Use `resolveAsset()` instead of manually constructing asset URLs** — the format may change between versions.

7. **Fetch with the secret token server-side only** — `getLocalessClient()` in React Server Components, API routes, or loaders. Any client-side fetching (`useLocaless`, or a second `localessInit()` in a Client Component) must use a public token.

---

## Exports Reference

```typescript
// Default export (@localess/react)

// Initialization & client
export { localessInit, getLocalessClient }

// Component registry (populated via localessInit's components/fallbackComponent options)
export { getComponent, getFallbackComponent }

// Visual Editor sync state
export { isSyncEnabled }            // enableSync && isBrowser() && isIframe()
export { isSyncConfigured }         // raw enableSync flag, no browser/iframe gating (read server-side, pass down as a prop)
export { localessSyncReady, localessSyncOn, localessSyncOnChange }
export { getOrigin }                // origin passed to localessInit; throws before init (used internally by /rsc)

// Rendering
export { LocalessComponent }        // Dynamic schema-to-component renderer (forwardRef; always spreads data-ll-* attrs)
export { LocalessDocument }         // Client-side schema renderer + built-in input/change sync (needs a 'use client' boundary)
export { LocalessRichText }         // Rich text component (content, renderers?)
export { renderRichText }           // Rich text → React nodes
export { resolveAsset }             // ContentAsset → full URL (+ optional AssetTransformParams)

// Hooks
export { useLocaless }              // Client-side content fetching with sync support

// Utilities (re-exported from @localess/client)
export { findLink }                 // ContentLink → URL string
export { localessEditable, localessEditableField }
export { isBrowser, isServer, isIframe }
export { loadLocalessSync, buildAssetQueryString }

// Error handling (re-exported from @localess/client)
export { LocalessApiError }         // Thrown by getContentBySlug/getContentById on a non-2xx response; check .status

// Types
export type { LocalessOptions, AnyLocalessComponent }      // localessInit options; registry component type
export type { LocalessClient, LocalessClientOptions }
export type { LocalessSchemaProps }                        // Props contract for registered schema components
export type { LocalessComponentProps, LocalessDocumentProps, LocalessRichTextProps, UseLocalessOptions }
export type { LocalessReactRichTextRenderers, LocalessReactRichTextOptions }
export type { ContentFetchParams, LinksFetchParams, TranslationFetchParams }
export type { AssetTransformParams }                       // Image transform params for resolveAsset
export type { LocalessSync, EventToApp, EventToAppOf, EventCallback, EventToAppType }
export type {
  Content, ContentData, ContentMetadata, ContentDataSchema, ContentDataField,
  ContentAsset, ContentRichText, ContentLink, ContentReference,
  Assets, Links, References, Translations,
}
export type { LocalessRichTextDocument, LocalessRichTextInput, LocalessRichTextMark, LocalessRichTextNode }
```

```typescript
// @localess/react/ssr — smallest bundle, no sync, no 'use client'
export { localessInit, getLocalessClient }
export { localessClient }           // raw @localess/client factory, for build-time scripts (prerender path enumeration)
export { getComponent, getFallbackComponent }
export { LocalessServerComponent }  // Dynamic schema-to-component renderer, server-safe, no data-ll-* attrs
export { LocalessServerDocument }   // Schema renderer, no sync — server-safe
export { LocalessRichText, renderRichText, resolveAsset, findLink }
export { localessEditable, localessEditableField, isBrowser, isServer, isIframe, loadLocalessSync, buildAssetQueryString }
export { LocalessApiError }
export type { LocalessServerComponentProps, LocalessServerDocumentProps }
// Same shared types as the default export (no isSyncConfigured / getOrigin)

// @localess/react/rsc — everything from /ssr, plus:
export { LocalessComponent }        // server-safe here (no 'use client')
export { LocalessDocument }         // Server Component, Server-Action-driven live sync, no client-side registration; needs a live server
export { useLocaless }              // requires 'use client'
export { isSyncEnabled, localessSyncOn, localessSyncOnChange, localessSyncReady }
export type { LocalessDocumentProps }
// NOT here: the default export's client-side LocalessDocument (import it from '@localess/react'), isSyncConfigured, getOrigin

// @localess/react/vite — Vite plugin (build-time only)
export { localess }                 // (options: LocalessOptions) => Plugin[]
export type { LocalessOptions, LocalessInitOptions }

// @localess/react/vite/virtual-modules — ambient declarations only
declare module 'virtual:localess-init' {}
declare module 'virtual:localess-components' {}
```
