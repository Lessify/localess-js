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

### Receiving Real-time Editor Events

Once the sync script is loaded, `window.localess` becomes available inside the iframe. Subscribe to it in a Client Component to apply live updates:

```tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent }: { initialContent: Content<Page> }) {
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    if (window.localess) {
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

The recommended pattern keeps data fetching server-side while the Client Component handles live sync:

```tsx
// app/[locale]/page.tsx — Server Component: fetches data, no sync logic
import { getLocalessClient } from "@localess/react";
import { PageClient } from "./page-client";
import type { Page } from "./.localess/localess";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale } = await searchParams;
  const client = getLocalessClient();
  const content = await client.getContentBySlug<Page>('home', { locale });

  return <PageClient initialContent={content} />;
}
```

```tsx
// app/[locale]/page-client.tsx — Client Component: renders + handles live edits
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClient({ initialContent }: { initialContent: Content<Page> }) {
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    if (window.localess) {
      window.localess.on(['input', 'change'], (event) => {
        if (event.type === 'input' || event.type === 'change') {
          setPageData(event.data);
        }
      });
    }
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

## Full Next.js 15 App Router Setup

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
export { renderRichTextToReact }    // Rich text → React nodes
export { resolveAsset }             // ContentAsset → full URL

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
