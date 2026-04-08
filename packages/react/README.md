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

- Node.js >= 20.0.0
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

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `origin` | `string` | ✅ | — | Fully qualified domain with protocol (e.g., `https://my-localess.web.app`) |
| `spaceId` | `string` | ✅ | — | Localess Space ID, found in Space settings |
| `token` | `string` | ✅ | — | Localess API token (keep secret — server-side only) |
| `version` | `'draft' \| string` | ❌ | `'published'` | Default content version |
| `debug` | `boolean` | ❌ | `false` | Enable debug logging |
| `cacheTTL` | `number \| false` | ❌ | `300000` | Cache TTL in milliseconds. Set `false` to disable |
| `components` | `Record<string, React.ElementType>` | ❌ | `{}` | Map of schema keys to React components |
| `fallbackComponent` | `React.ElementType` | ❌ | — | Component rendered when a schema key has no registered component |
| `enableSync` | `boolean` | ❌ | `false` | Load the Visual Editor sync script for live-editing support |

---

## `LocalessComponent`

`LocalessComponent` is a dynamic renderer that maps Localess content data to your registered React components by schema key. It automatically applies Visual Editor attributes when sync is enabled.

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

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `ContentData` | ✅ | Content data object from Localess. The component looks up `data._schema` in the component registry |
| `links` | `Links` | ❌ | Resolved content links map, forwarded to the rendered component |
| `references` | `References` | ❌ | Resolved references map, forwarded to the rendered component |
| `ref` | `React.Ref<HTMLElement>` | ❌ | Ref forwarded to the rendered component's root element |
| `...rest` | `any` | ❌ | Any additional props are forwarded to the rendered component |

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

> **Deprecated:** `llEditable()` and `llEditableField()` are deprecated aliases. Use `localessEditable()` and `localessEditableField()` instead.

---

## Rich Text Rendering

### `renderRichTextToReact(content)`

Converts a Localess `ContentRichText` object to a React node tree. Supports the full range of rich text formatting produced by the Localess editor.

```tsx
import { renderRichTextToReact } from "@localess/react";

const Article = ({ data }) => (
  <article>
    <h1>{data.title}</h1>
    <div>{renderRichTextToReact(data.body)}</div>
  </article>
);
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

These functions allow dynamic management of the component registry after initialization.

```ts
import {
  registerComponent,
  unregisterComponent,
  setComponents,
  getComponent,
  setFallbackComponent,
  getFallbackComponent,
  isSyncEnabled,
} from "@localess/react";

// Register a new component
registerComponent('hero-block', HeroBlock);

// Unregister a component
unregisterComponent('hero-block');

// Replace the entire registry
setComponents({ 'page': Page, 'hero': Hero });

// Retrieve a component by schema key
const Component = getComponent('hero');

// Configure the fallback component
setFallbackComponent(UnknownComponent);

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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | `string \| string[]` | ✅ | Content slug. Arrays are joined with `/` — e.g. `['blog', 'post']` → `'blog/post'` |
| `options` | `ContentFetchParams` | ❌ | Same fetch options as `getContentBySlug` (locale, version, resolveReference, resolveLink) |

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

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `ContentData` | ✅ | Initial content data (typically server-fetched) |
| `links` | `Links` | ❌ | Resolved links map, forwarded to the inner `LocalessComponent` |
| `references` | `References` | ❌ | Resolved references map, forwarded to the inner `LocalessComponent` |
| `ref` | `React.Ref<HTMLElement>` | ❌ | Forwarded to the rendered root element |
| `...rest` | `any` | ❌ | Any additional props are forwarded |

> `LocalessDocument` subscribes to `input` / `change` editor events automatically when `enableSync` is active. It is a Client Component internally — no `'use client'` directive needed at the call site in Server Components.

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
      {pageData?.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={initialContent.links} references={initialContent.references} />
      ))}
    </main>
  );
}
```

**Available events via `window.localess.on()`:**

| Event | When |
|-------|------|
| `input` | User is typing in a field (real-time preview) |
| `change` | Field value confirmed |
| `save` | Content saved |
| `publish` | Content published |
| `pong` | Editor heartbeat response |
| `enterSchema` | Editor cursor enters a schema block |
| `hoverSchema` | Editor cursor hovers over a schema block |

> `window.localess` only exposes `.on()` and `.onChange()` — there is no `.off()` method.

---

## Full Example (Next.js 16.2 App Router)

The recommended Next.js pattern is to **preload data server-side** and pass it to the Client Component. This avoids a loading flash — the page renders immediately with server data, then Visual Editor sync kicks in if active.

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

```tsx
// app/[locale]/page.tsx (Server Component — no separate client file needed)
import { getLocalessClient, LocalessDocument } from "@localess/react";
import type { Page } from "./.localess/localess";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });

  // LocalessDocument handles sync internally — no 'use client' wrapper needed here
  return (
    <LocalessDocument
      data={content.data}
      links={content.links}
      references={content.references}
    />
  );
}
```

### Client Component — Option C: Manual

Full control over state and sync subscription. Use when you need custom logic around live updates.

```tsx
// app/[locale]/page-client-manual.tsx
'use client';

import { useEffect, useState } from "react";
import { LocalessComponent, localessEditable, isSyncEnabled, isBrowser } from "@localess/react";
import type { Content, Page } from "./.localess/localess";

export function PageClientManual({
  initialContent,
}: {
  initialContent: Content<Page>;
}) {
  // Initialize with server-preloaded data — no loading state needed
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
      {pageData?.body.map(item => (
        <LocalessComponent key={item._id} data={item} links={initialContent.links} references={initialContent.references} />
      ))}
    </main>
  );
}
```

---

## Re-exported from `@localess/client`

The following are re-exported for convenience so you only need to import from `@localess/react`:

**Types:** `Content`, `ContentData`, `ContentMetadata`, `ContentDataSchema`, `ContentDataField`, `ContentAsset`, `ContentRichText`, `ContentLink`, `ContentReference`, `Links`, `References`, `Translations`, `LocalessClient`, `LocalessSync`, `EventToApp`, `EventCallback`, `EventToAppType`

**Functions:** `localessEditable`, `localessEditableField`, `llEditable` *(deprecated)*, `llEditableField` *(deprecated)*, `isBrowser`, `isServer`, `isIframe`, `resolveAsset`, `findLink`, `useLocaless`, `renderRichTextToReact`, `localessInit`, `getLocalessClient`, `registerComponent`, `unregisterComponent`, `setComponents`, `getComponent`, `setFallbackComponent`, `getFallbackComponent`, `isSyncEnabled`

**Components:** `LocalessComponent`, `LocalessDocument`

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
