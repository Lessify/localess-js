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
| `data` | `ContentData` | ✅ | Content data object from Localess. The component looks up `data._schema` or `data.schema` in the component registry |
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

## Visual Editor Events

When your application is opened inside the Localess Visual Editor, subscribe to live-editing events via `window.localess`.

```tsx
'use client';

import { useEffect, useState } from "react";
import { getLocalessClient } from "@localess/react";
import type { Content } from "@localess/react";

export function PageClient({ initialData }: { initialData: Content<Page> }) {
  const [pageData, setPageData] = useState(initialData.data);

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
      {pageData.body.map(item => (
        <LocalessComponent key={item._id} data={item} />
      ))}
    </main>
  );
}
```

---

## Full Example (Next.js 15 App Router)

```tsx
// app/layout.tsx (Server Component — safe to use API token here)
import { localessInit } from "@localess/react";
import { Page, Header, Teaser, Footer } from "@/components";

localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: process.env.NODE_ENV === 'development',
  components: { Page, Header, Teaser, Footer },
});

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

```tsx
// app/page.tsx (Server Component)
import { getLocalessClient, LocalessComponent, localessEditable } from "@localess/react";
import type { Page } from "./.localess/localess";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale } = await searchParams;
  const client = getLocalessClient();
  const content = await client.getContentBySlug<Page>('home', { locale });

  return (
    <main {...localessEditable(content.data)}>
      {content.data?.body.map(item => (
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

---

## Re-exported from `@localess/client`

The following are re-exported for convenience so you only need to import from `@localess/react`:

**Types:** `Content`, `ContentData`, `ContentMetadata`, `ContentDataSchema`, `ContentDataField`, `ContentAsset`, `ContentRichText`, `ContentLink`, `ContentReference`, `Links`, `References`, `Translations`, `LocalessClient`, `LocalessSync`, `EventToApp`, `EventCallback`, `EventToAppType`

**Functions:** `localessEditable`, `localessEditableField`, `llEditable` *(deprecated)*, `llEditableField` *(deprecated)*, `isBrowser`, `isServer`, `isIframe`

---

## License

[MIT](../../LICENSE)
