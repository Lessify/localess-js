<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess React SDK

The `@localess/react` package is the official React integration for the [Localess](https://github.com/Lessify/localess) headless CMS platform. It provides component mapping, rich text rendering, and Visual Editor synchronization support for React applications.

> **⚠️ Security Notice:**
> This package uses `@localess/client` internally, which requires an API token for server-side data fetching.
> Always fetch Localess content server-side (e.g., Next.js Server Components, API routes, or `getServerSideProps`) and never expose your token in client-side code.

## Requirements

- Node.js >= 24.0.0
- React 17, 18, or 19

## Installation

```bash
# npm
npm install @localess/react

# yarn
yarn add @localess/react

# pnpm
pnpm add @localess/react
```

---

## Choosing the Right Export

`@localess/react` provides three different exports to suit different rendering strategies:

| Export                | Use Case                                              | Live Editing | Static Export |
|-----------------------|-------------------------------------------------------|--------------|---------------|
| `@localess/react`     | Single Page Applications (SPA), client-side rendering | ✅            | ✅             |
| `@localess/react/ssr` | SSR without live editing, Next.js static exports      | ❌            | ✅             |
| `@localess/react/rsc` | React Server Components with live editing             | ✅            | ❌             |

### When to Use Each Export

**Use `@localess/react`** (default) for:
- Single Page Applications (SPA) or fully client-rendered React apps
- Apps where `localessInit` and components run entirely in the browser

**Use `@localess/react/ssr`** for:
- Next.js projects with `output: 'export'` (static site generation), when you don't need live editing and want the smallest bundle
- Server-side rendering where live editing is not required
- Scenarios where bundle size matters and you want to exclude all browser-only sync code

**Use `@localess/react/rsc`** for:
- Next.js App Router with React Server Components
- Apps that need live Visual Editor editing alongside server rendering
- Modern Next.js apps with a server/client component split

### Quick Comparison

```ts
// SPA — everything runs client-side
import { localessInit, LocalessComponent, useLocaless } from "@localess/react";

// SSR — server-safe, no live editing, no hooks
import { localessInit, LocalessServerComponent } from "@localess/react/ssr";

// RSC — server components + client components for live editing
import { localessInit, LocalessServerComponent, LocalessDocument } from "@localess/react/rsc"; // server-safe
import { useLocaless, localessEditable } from "@localess/react/rsc";                           // client only
```

> [!NOTE]
> `@localess/react/rsc`'s primary `LocalessDocument` is Server-Action-driven and needs a live server at request time — it does not work under `output: 'export'`. For static exports with live editing, use `LocalessClientDocument` (also from `/rsc`) instead, which needs client-side component registration. Use `@localess/react/ssr` only when you deliberately want the smallest bundle and don't need live editing at all.

---

## Getting Started

### 1. Initialize the SDK

Call `localessInit` once at application startup (e.g., in your root layout or `_app.tsx`) to configure the client, register your components, and optionally enable the Visual Editor.

```tsx
import { localessInit } from "@localess/react";
import { Page, Header, Teaser, Footer } from "@/components";

localessInit({
  origin: "https://my-localess.web.app",
  spaceId: "YOUR_SPACE_ID",
  token: "YOUR_API_TOKEN",
  enableSync: true, // Enable Visual Editor sync script
  components: {
    'page': Page,
    'header': Header,
    'teaser': Teaser,
    'footer': Footer,
  },
});
```

### Initialization Options

| Option              | Type                                | Required | Default       | Description                                                                                                                                                                                                 |
|---------------------|-------------------------------------|----------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `origin`            | `string`                            | ✅        | —             | Fully qualified domain with protocol (e.g., `https://my-localess.web.app`)                                                                                                                                  |
| `spaceId`           | `string`                            | ✅        | —             | Localess Space ID, found in Space settings                                                                                                                                                                  |
| `token`             | `string`                            | ✅        | —             | Localess API token (keep secret — server-side only)                                                                                                                                                         |
| `version`           | `'draft'`                           | ❌        | `'published'` | Default content version                                                                                                                                                                                     |
| `debug`             | `boolean`                           | ❌        | `false`       | Enable debug logging                                                                                                                                                                                        |
| `cacheTTL`          | `number \| false`                   | ❌        | `300`         | Cache TTL in **seconds** (default: 5 minutes). Set `false` to disable caching entirely                                                                            |
| `components`        | `Record<string, React.ElementType>` | ❌        | `{}`          | Map of schema keys to React components                                                                                                                                                                      |
| `fallbackComponent` | `React.ElementType`                 | ❌        | —             | Component rendered when a schema key has no registered component                                                                                                                                            |
| `enableSync`        | `boolean`                           | ❌        | `false`       | Load the Visual Editor sync script for live-editing support                                                                                                                                                 |

---

## `LocalessComponent`

`LocalessComponent` is a dynamic renderer that maps Localess content data to your registered React components by schema key. It always applies Visual Editor attributes (`data-ll-id` / `data-ll-schema`) — they're inert outside the Visual Editor iframe.

```tsx
import { LocalessComponent } from "@localess/react";

// Render a single content block
<LocalessComponent data={content.data} />

// Render a list of nested blocks
{data.body.map(item => (
  <LocalessComponent
    key={item._id}
    data={item}
    links={content.links}
    references={content.references}
  />
))}
```

### Props

| Prop         | Type                     | Required | Description                                                                                        |
|--------------|--------------------------|----------|----------------------------------------------------------------------------------------------------|
| `data`       | `ContentData`            | ✅        | Content data object from Localess. The component looks up `data._schema` in the component registry |
| `links`      | `Links`                  | ❌        | Resolved content links map, forwarded to the rendered component                                    |
| `references` | `References`             | ❌        | Resolved references map, forwarded to the rendered component                                       |
| `assets`     | `Assets`                 | ❌        | Resolved content assets map, forwarded to the rendered component                                   |
| `ref`        | `React.Ref<HTMLElement>` | ❌        | Ref forwarded to the rendered component's root element                                             |
| `...rest`    | `any`                    | ❌        | Any additional props are forwarded to the rendered component                                       |

> If a schema key is not registered and no `fallbackComponent` is configured, `LocalessComponent` renders an error message in the DOM.

---

## Marking Editable Content

Use these helpers to add Visual Editor attributes to your JSX elements. They enable element highlighting and selection in the Localess Visual Editor.

### `localessEditable(content)`

Marks a content block root element as editable.

```tsx
import { localessEditable } from "@localess/react";

const Header = ({ data }) => (
  <nav {...localessEditable(data)}>
    {/* ... */}
  </nav>
);
```

### `localessEditableField<T>(fieldName)`

Marks a specific field within a content block as editable, with type-safe field name inference when combined with generated types.

```tsx
import { localessEditableField } from "@localess/react";

const Hero = ({ data }: { data: HeroBlock }) => (
  <section {...localessEditable(data)}>
    <h1 {...localessEditableField<HeroBlock>('title')}>{data.title}</h1>
    <p {...localessEditableField<HeroBlock>('subtitle')}>{data.subtitle}</p>
  </section>
);
```

---

## Rich Text Rendering

### `<LocalessRichText>` and `renderRichText(content, options?)`

Converts a Localess `ContentRichText` object to a native React node tree — built on `@localess/richtext`, no TipTap at runtime. Supports the full range of rich text formatting produced by the Localess editor, with per-node/per-mark overrides via the `renderers` option (React components receiving the node's fields plus `children`).

```tsx
import { LocalessRichText, renderRichText } from "@localess/react";

const Article = ({ data }) => (
  <article>
    <h1>{data.title}</h1>
    <LocalessRichText content={data.body} />
  </article>
);

// function form, with a custom link renderer:
renderRichText(data.body, {
  renderers: { link: ({ attrs, children }) => <a className="app-link" href={attrs.href}>{children}</a> },
});
```

**Supported rich text elements:**

- Document structure
- Headings (h1–h6)
- Paragraphs
- Text formatting: **bold**, *italic*, ~~strikethrough~~, underline
- Ordered and unordered lists
- Code blocks (with syntax highlighting support)
- Links (inline)

---

## Accessing the Client

### `getLocalessClient()`

Returns the `LocalessClient` instance created during `localessInit`. Use this in server-side data-fetching functions.

```ts
import { getLocalessClient } from "@localess/react";

async function fetchPageData(locale?: string) {
  const client = getLocalessClient();
  return client.getContentBySlug<Page>('home', { locale });
}
```

> Throws an error if called before `localessInit` has been executed.

---

## Component Registry API

The component registry (and fallback component) are set via `localessInit`'s `components`/`fallbackComponent` options. Calling `localessInit` again replaces the registry entirely. These functions let you read the registry without going through `localessInit`.

```ts
import { getComponent, getFallbackComponent, isSyncEnabled } from "@localess/react";

// Retrieve a component by schema key
const Component = getComponent('hero');

// Get the current fallback component
const fallback = getFallbackComponent();

// Check if Visual Editor sync is enabled
const syncEnabled = isSyncEnabled();
```

---

## Assets

### `resolveAsset(asset)`

Resolves a `ContentAsset` object to a fully qualified URL using the initialized client's origin.

```tsx
import { resolveAsset } from "@localess/react";

const Image = ({ data }) => (
  <img src={resolveAsset(data.image)} alt={data.imageAlt} />
);
```

---

## `useLocaless` Hook

`useLocaless<T>` fetches content by slug in a Client Component and automatically subscribes to Visual Editor live updates when `enableSync` is active.

```tsx
'use client';

import { useLocaless, LocalessComponent } from "@localess/react";
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

### Parameters

| Parameter | Type                 | Required | Description                                                                               |
|-----------|----------------------|----------|-------------------------------------------------------------------------------------------|
| `slug`    | `string \| string[]` | ✅        | Content slug. Arrays are joined with `/` — e.g. `['blog', 'post']` → `'blog/post'`        |
| `options` | `ContentFetchParams` | ❌        | Same fetch options as `getContentBySlug` (locale, version, resolveReference, resolveLink) |

Returns `Content<T> | undefined` — `undefined` while the initial fetch is in progress.

When `enableSync` is active and the page is rendered inside the Localess Visual Editor iframe, the hook automatically subscribes to `input` / `change` events and updates the returned content in place.

---

## Link Utilities

### `findLink(links, link)`

Resolves a `ContentLink` field to a URL string. Use it to build `href` values from Localess content links.

```tsx
import { findLink } from "@localess/react";

// type: 'content' → '/' + fullSlug, or '/not-found' if not in map
// type: 'url'     → raw URI unchanged
const href = findLink(content.links, data.ctaLink);

const NavLink = ({ data, links }) => (
  <a href={findLink(links, data.link)}>{data.label}</a>
);
```

---

## Visual Editor Events

### With `useLocaless` Hook

When `enableSync: true` is set in `localessInit`, the `useLocaless` hook handles the full cycle automatically — initial fetch and live sync updates — with no extra wiring needed.

```tsx
'use client';

import { useLocaless, LocalessComponent, localessEditable } from "@localess/react";
import type { Page } from "./.localess/localess";

export function PageView({ slug, locale }: { slug: string; locale?: string }) {
  const content = useLocaless<Page>(slug, { locale });

  if (!content) return null;

  return (
    <main {...localessEditable(content.data)}>
      {content.data?.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={content.links} references={content.references} />
      ))}
    </main>
  );
}
```

### With `LocalessDocument` Component

`LocalessDocument` is a component alternative to the hook. Pass it server-fetched content data and it handles live sync updates internally, delegating rendering to `LocalessComponent`.

```tsx
// app/[locale]/page.tsx (Server Component — fetches data)
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
| `document` | `Content<T>`             | ✅        | Full content response object (from `getContentBySlug`/`getContentById`)  |
| `ref`      | `React.Ref<HTMLElement>` | ❌        | Forwarded to the rendered root element                                   |

> `LocalessDocument` subscribes to `input` / `change` editor events automatically when `enableSync` is active.
>
> `@localess/react/rsc`'s `LocalessDocument` is a Server Component — its live sync is driven by a Server Action, not client-side re-render, so no component registration is needed beyond the single server-side `localessInit()` call above. (The default SPA export's `LocalessDocument`, used outside App Router, is a different, `'use client'` implementation — see the SPA example below. `/rsc` also exports `LocalessClientDocument`, an `output: 'export'`-only fallback that does need client-side registration — see `docs/react.md`'s "Client-Side Fallback for Static Export".)

### Manual Integration

If you manage content state yourself without `useLocaless` or `LocalessDocument`, subscribe to editor events directly via `window.localess`:

```tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, localessSyncOn } from "@localess/react";
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
      {pageData?.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={initialContent.links} references={initialContent.references} />
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

> `window.localess` only exposes `.on()` and `.onChange()` — there is no `.off()` method.

`localessSyncOn(event, callback)` wraps `.on()`; `localessSyncOnChange(callback)` wraps `.onChange()` — equivalent to `localessSyncOn(['input', 'change'], callback)`, firing only for content-change events (`callback` receives the `input`/`change` variant, not the full `EventToApp` union). Both handle the `isSyncEnabled()` check and the `localessSyncReady()` wait internally.

---

## Full Example — SPA / Default (`@localess/react`)

For SPAs or fully client-rendered React apps. All imports use the default `@localess/react` export.

### Setup — `app/layout.tsx`

```tsx
// Server Component — safe to use API token here
import { localessInit } from "@localess/react";
import { Page, Header, Teaser, Footer } from "@/components";

localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: process.env.NODE_ENV !== 'production',
  components: { Page, Header, Teaser, Footer },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>;
}
```

### Server Component — `app/[locale]/page.tsx`

Fetches content during SSR and passes it as a prop. The client component receives it already populated — no loading state needed.

```tsx
import { getLocalessClient } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

// Choose one of the three client components below
import { PageClientHook } from "./page-client-hook";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  return <PageClientHook initialContent={content} locale={locale} />;
}
```

### Client Component — Option A: `useLocaless` Hook

The hook re-fetches on the client and falls back to the server-preloaded data until it resolves. Live sync is wired automatically.

```tsx
// app/[locale]/page-client-hook.tsx
'use client';

import { useLocaless, LocalessComponent, localessEditable } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClientHook({
  initialContent,
  locale,
}: {
  initialContent: Content<Page>;
  locale?: string;
}) {
  // ?? initialContent: renders with server data immediately, switches to hook result once ready
  const content = useLocaless<Page>('home', { locale }) ?? initialContent;

  return (
    <main {...localessEditable(content.data)}>
      {content.data?.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={content.links} references={content.references} />
      ))}
    </main>
  );
}
```

### Client Component — Option B: `LocalessDocument` Component

Skips client re-fetch entirely — uses server-preloaded data and only subscribes to live sync events. Simpler when you don't need client-side refetching.

> This specific pattern — calling `LocalessDocument` directly from a Server Component with no separate `'use client'` file — needs the `@localess/react/rsc` import, not the plain `@localess/react` export used elsewhere in this SPA example. See [Full Example — Next.js App Router with RSC](#full-example--nextjs-app-router-with-rsc-localessreactrsc) below for why.

```tsx
// app/[locale]/page.tsx (Server Component — no separate client file needed)
import { getLocalessClient, LocalessDocument } from "@localess/react/rsc";
import type { Page } from "./.localess/localess";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  // LocalessDocument handles sync internally — no 'use client' wrapper needed here
  return <LocalessDocument document={content} />;
}
```

### Client Component — Option C: Manual

Full control over state and sync subscription. Use when you need custom logic around live updates.

```tsx
// app/[locale]/page-client-manual.tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, localessSyncOn } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClientManual({
  initialContent,
}: {
  initialContent: Content<Page>;
}) {
  // Initialize with server-preloaded data — no loading state needed
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
      {pageData?.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={initialContent.links} references={initialContent.references} />
      ))}
    </main>
  );
}
```

---

## Full Example — Next.js Static Export (`@localess/react/ssr`)

Use `@localess/react/ssr` when your Next.js project uses `output: 'export'` for static site generation and you don't need live editing. If you do need live editing on a static export, use `@localess/react/rsc`'s `LocalessClientDocument` instead — see `docs/react.md`'s "Client-Side Fallback for Static Export" section for the registration step this requires.

### `next.config.js`

```js
/** @type {import('next').NextConfig} */
module.exports = { output: 'export' };
```

### Setup — `lib/localess.ts`

```ts
import { localessInit } from "@localess/react/ssr";
import { Page, Header, Teaser } from "@/components";

export const getClient = localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  // enableSync is not applicable in static export — omit or set to false
  components: { Page, Header, Teaser },
});
```

### Page — `app/page.tsx`

```tsx
import { LocalessServerComponent } from "@localess/react/ssr";
import { getLocalessClient } from "@localess/react/ssr";
import "@/lib/localess"; // ensure init runs

export default async function Home() {
  const client = getLocalessClient();
  const content = await client.getContentBySlug("home", { locale: "en" });
  return (
    <main>
      <LocalessServerComponent data={content.data} links={content.links} references={content.references} />
    </main>
  );
}
```

---

## Full Example — Next.js App Router with RSC (`@localess/react/rsc`)

Use `@localess/react/rsc` when you want React Server Components and Visual Editor live editing together.

### Setup — `app/layout.tsx`

```tsx
// Server Component — safe to use API token here
import { localessInit } from "@localess/react/rsc";
import { Page, Header, Teaser, Footer } from "@/components";

localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: process.env.NODE_ENV !== 'production',
  components: { Page, Header, Teaser, Footer },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>;
}
```

### Rendering — `app/[locale]/page.tsx`

Use `LocalessDocument` for a zero-boilerplate live-editing integration, or `useLocaless` for client-side re-fetching with more control.

**Option A — `LocalessDocument` (recommended):** a Server Component, so it renders directly inside the Server Component page — no separate Client Component file needed, and no client-side component registration either. Live sync is handled by a Server Action shipped inside the SDK.

```tsx
import { getLocalessClient, LocalessDocument } from "@localess/react/rsc";

export default async function Home({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug("home", { locale });
  return <LocalessDocument document={content} />;
}
```

**Option B — `useLocaless` hook:** re-fetches on the client, so it needs an actual `'use client'` file.

```tsx
// app/[locale]/page.tsx (Server Component)
import { getLocalessClient } from "@localess/react/rsc";
import PageClient from "./page-client";

export default async function Home({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug("home", { locale });
  return <PageClient initialContent={content} locale={locale} />;
}
```

```tsx
// app/[locale]/page-client.tsx (Client Component)
'use client';
import { useLocaless, LocalessComponent, localessEditable } from "@localess/react/rsc";

export default function PageClient({ initialContent, locale }) {
  const content = useLocaless("home", { locale }) ?? initialContent;
  return (
    <main {...localessEditable(content.data)}>
      {content.data?.body?.map(item => (
        <LocalessComponent key={item._id} data={item} links={content.links} references={content.references} />
      ))}
    </main>
  );
}
```

---

## Export Reference

The table below shows which symbols are available in each export.

| Symbol                                                 | `@localess/react` | `@localess/react/ssr` | `@localess/react/rsc` |
|--------------------------------------------------------|:-----------------:|:---------------------:|:---------------------:|
| `localessInit`                                         |         ✅         |           ✅           |           ✅           |
| `getLocalessClient`                                    |         ✅         |           ✅           |           ✅           |
| `getComponent`                                         |         ✅         |           ✅           |           ✅           |
| `getFallbackComponent`                                 |         ✅         |           ✅           |           ✅           |
| `resolveAsset`                                         |         ✅         |           ✅           |           ✅           |
| `LocalessComponent`                                    |         ✅         |           ❌           |           ✅           |
| `LocalessServerComponent` / `LocalessServerDocument`   |         ❌         |           ✅           |           ✅           |
| `LocalessRichText` / `renderRichText`                  |         ✅         |           ✅           |           ✅           |
| `findLink`                                             |         ✅         |           ✅           |           ✅           |
| `isServer`                                             |         ✅         |           ✅           |           ✅           |
| All content types                                      |         ✅         |           ✅           |           ✅           |
| `LocalessDocument`                                     |         ✅         |           ❌           |           ✅           |
| `useLocaless`                                          |         ✅         |           ❌           |           ✅           |
| `localessEditable` / `localessEditableField`           |         ✅         |           ✅           |           ✅           |
| `isBrowser` / `isIframe`                               |         ✅         |           ✅           |           ✅           |
| `isSyncEnabled` / `localessSyncOn` / `localessSyncOnChange` / `localessSyncReady` |         ✅         |           ❌           |           ✅           |
| Sync event types (`LocalessSync`, `EventToApp`, …)     |         ✅         |           ✅           |           ✅           |

---

## AI Coding Agents

This package ships a [`SKILL.md`](./SKILL.md) file that provides AI coding agents (GitHub Copilot, Claude Code, Cursor, and others) with accurate, up-to-date APIs, patterns, and best practices. Most agents automatically read `SKILL.md` when starting a session.

### Using SKILL.md in your project

`SKILL.md` is included in the npm package, so it is available locally after installation. Reference it from your project's `AGENTS.md` to ensure your agent reads accurate Localess documentation every session:

```markdown
## Localess

@node_modules/@localess/react/SKILL.md
```

The `@` prefix is the syntax used by most agent tools (GitHub Copilot, Claude Code, Cursor) to import file contents inline into the agent context.

When you change the public API of this package, update `SKILL.md` alongside your code:

- **New option or parameter** → add it to the relevant options table and usage example
- **Changed behaviour** → update the description and any affected code snippets
- **Deprecated API** → mark it clearly and point to the replacement
- **New component or hook** → add a full entry with props and usage example

---

## License

[MIT](../../LICENSE)
