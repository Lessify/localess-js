# SKILL: @localess/react

## Overview

`@localess/react` is the **React integration layer** for Localess. It builds on `@localess/client` and adds:

- A **component registry** mapping Localess schema keys to React components
- `<LocalessComponent>` — dynamic content renderer
- **Visual Editor sync** support with editable attributes
- **Rich text** rendering from Tiptap JSON format
- **Asset URL** resolution

**Peer dependencies:** React 17, 18, or 19 + react-dom.

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
  cacheTTL: 300000,       // 5 minutes default
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
3. If found → render component with `data`, `links`, `references`; when sync is enabled, also injects `data-ll-id` and `data-ll-schema` as props (user components should spread `{...localessEditable(data)}` on their root element)
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

`localessInit()` is the **single entry point** for Visual Editor integration. Setting `enableSync: true` handles everything: injecting the sync script, registering components, and enabling editable attribute injection on `LocalessComponent`.

### What `enableSync: true` activates

1. Injects the Localess sync script (`loadLocalessSync`) into `<head>`
2. Makes `LocalessComponent` inject `data-ll-id` and `data-ll-schema` on rendered elements
3. Makes `localessEditable()` / `localessEditableField()` emit their `data-ll-*` attributes (no-op when sync is off)

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

import { useLocaless, LocalessComponent, localessEditable } from "@localess/react";
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
// Server Component — pass fetched data directly to LocalessDocument
import { getLocalessClient, LocalessDocument } from "@localess/react";
import type { Page } from "./.localess/localess";

export default async function HomePage({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale } = await params;
  const client = getLocalessClient();
  const content = await client.getContentBySlug<Page>('home', { locale });

  return (
    <LocalessDocument
      data={content.data}
      links={content.links}
      references={content.references}
    />
  );
}
```

**Props** (same shape as `LocalessComponent`):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `ContentData` | ✅ | Initial content data |
| `links` | `Links` | ❌ | Resolved links map |
| `references` | `References` | ❌ | Resolved references map |
| `ref` | `React.Ref<HTMLElement>` | ❌ | Forwarded to the rendered root element |

> Subscribes to `input` / `change` events automatically when `enableSync` is active. Unlike `useLocaless`, it does not fetch content — it only handles live sync for data passed in as props.

### Manual Integration

If you manage content state yourself without `useLocaless` or `LocalessDocument`, subscribe to editor events directly via `window.localess`:

```tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, isSyncEnabled, isBrowser } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent }: { initialContent: Content<Page> }) {
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    if (isSyncEnabled() && isBrowser() && window.localess) {
      window.localess.on(['input', 'change'], (event) => {
        if (event.type === 'input' || event.type === 'change') {
          setPageData(event.data);
        }
      });
    }
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

### Pattern: Split Server/Client Components (Next.js App Router)

**Preload data server-side** and pass it to the Client Component. The page renders immediately with server data — no loading flash — and Visual Editor sync kicks in on top.

**Server Component** (same for all three options below):

```tsx
// app/[locale]/page.tsx
import { getLocalessClient } from "@localess/react";
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

import { useLocaless, LocalessComponent, localessEditable } from "@localess/react";
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
import { getLocalessClient, LocalessDocument } from "@localess/react";
import type { Page } from "./.localess/localess";

export default async function HomePage({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  return (
    <LocalessDocument data={content.data} links={content.links} references={content.references} />
  );
}
```

**Option C — Manual**: full control, initialise state with server-preloaded data, subscribe to sync yourself.

```tsx
// app/[locale]/page-client.tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, isSyncEnabled, isBrowser } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent }: { initialContent: Content<Page> }) {
  // Server-preloaded data used as initial state — no loading flash
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    if (isSyncEnabled() && isBrowser() && window.localess) {
      window.localess.on(['input', 'change'], (event) => {
        if (event.type === 'input' || event.type === 'change') {
          setPageData(event.data);
        }
      });
    }
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

// ContentAsset → full URL
const imageUrl = resolveAsset(data.heroImage);
// Returns: https://my-localess.web.app/api/v1/spaces/{spaceId}/assets/{uri}
```

Set up automatically during `localessInit()` from `origin` + `spaceId`.

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
import { getLocalessClient } from "@localess/react";

const client = getLocalessClient(); // throws if localessInit() not called
const [content, translations] = await Promise.all([
  client.getContentBySlug<Page>('home', { locale: 'en', resolveReference: true }),
  client.getTranslations('en'),
]);
```

---

## Full Next.js 16.2 App Router Setup

```typescript
// app/layout.tsx (Server Component)
import { localessInit } from "@localess/react";
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
// Initialization & client
export { localessInit, getLocalessClient }

// Component registry
export { registerComponent, unregisterComponent, setComponents, getComponent }
export { setFallbackComponent, getFallbackComponent, isSyncEnabled }

// Rendering
export { LocalessComponent }        // Dynamic schema-to-component renderer
export { LocalessDocument }         // Schema renderer + built-in Visual Editor sync
export { renderRichTextToReact }    // Rich text → React nodes
export { resolveAsset }             // ContentAsset → full URL

// Hooks
export { useLocaless }              // Client-side content fetching with sync support

// Utilities
export { findLink }                 // ContentLink → URL string

// Visual editor (re-exported from @localess/client)
export { localessEditable, localessEditableField }
export { llEditable, llEditableField }  // Deprecated

// Environment utilities (re-exported from @localess/client)
export { isBrowser, isServer, isIframe }

// Types (re-exported from @localess/client + local)
export type { LocalessClient, LocalessOptions }
export type { LocalessSync, EventToApp, EventCallback, EventToAppType }
export type {
  Content, ContentData, ContentMetadata, ContentDataSchema, ContentDataField,
  ContentAsset, ContentRichText, ContentLink, ContentReference,
  Links, References, Translations,
}
```
