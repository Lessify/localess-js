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

`@localess/react/rsc`'s primary `LocalessDocument` needs a live server at request time (its live sync is Server-Action-driven) and works under `default`/`standalone`, but not `output: 'export'` — use `LocalessClientDocument` there instead (see "Client-Side Fallback for Static Export"). `@localess/react/ssr` remains the right choice when you deliberately want to exclude all sync code for the smallest bundle.

### What `@localess/react/ssr` excludes

The smallest bundle. It exports `LocalessServerComponent` / `LocalessServerDocument` (server-safe, no sync attributes) in place of the default `LocalessComponent` / `LocalessDocument`, and does NOT include:
- `LocalessComponent` / `LocalessDocument` (available from the default export and `/rsc`)
- `useLocaless` hook (requires `'use client'`)
- `isSyncEnabled`, `localessSyncOn`, `localessSyncOnChange`, `localessSyncReady` (not meaningful without live editing)

`localessEditable`, `localessEditableField`, `isBrowser`, `isIframe`, and the sync event types (`LocalessSync`, `EventToApp`, `EventCallback`, `EventToAppType`) ARE included — they're cheap to bundle and harmless outside a client context.

### What `@localess/react/rsc` adds back

Re-exports everything from `/ssr`, plus:
- `LocalessComponent` — server-safe (no `'use client'`), usable directly in a Server Component
- `LocalessDocument` — the **primary** live-editing entry point: a Server Component whose live sync is driven by a Server Action, with no client-side component registration needed. Requires a live server at request time (not usable under `output: 'export'`)
- `LocalessClientDocument` — the `output: 'export'` fallback: the exact same `'use client'` component as the default export's `LocalessDocument`; render it from inside a Client Component boundary, and see [Client-Side Fallback for Static Export](#client-side-fallback-for-static-export) for the registration step it requires
- `useLocaless` hook (requires `'use client'`)
- `isSyncEnabled`, `localessSyncOn`, `localessSyncOnChange`, `localessSyncReady`

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

### Reading the registry

The registry (and fallback component) are set via `localessInit`'s `components`/`fallbackComponent` options — calling `localessInit` again replaces the registry entirely.

```typescript
import { getComponent, getFallbackComponent } from "@localess/react";

const HeroComp = getComponent('hero');
const fallback = getFallbackComponent();
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
| Works in RSC | Yes | Requires a Client Component boundary (same `'use client'` component for default and `/rsc`) | No (`'use client'`) |
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

### How `/rsc` Live Sync Works

`LocalessDocument` from `/rsc` is a Server Component. Live editing is driven by a Server Action shipped inside the SDK: a small client listener calls it on every Visual Editor sync event, the action stashes the edited data in an in-process cache and calls `revalidatePath`, and Next.js refreshes the Server Component tree — which re-renders using the cache and the server's own component registry. **No client-side component registration is needed** — `localessInit({ components })` once, server-side, is enough:

```tsx
import { getLocalessClient, LocalessDocument, localessInit } from "@localess/react/rsc";

localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: true,
  components: { page: Page, hero: Hero },
});

export default async function HomePage({ params }) {
  const { locale } = await params;
  const content = await getLocalessClient().getContentBySlug('home', { locale });
  return <LocalessDocument document={content} />;
}
```

**Known limitation:** the live-edit cache is in-process memory (`globalThis`), matching how Storyblok's own React SDK implements the same mechanism. On a `default`-mode deployment that runs multiple serverless instances with no shared memory, a live edit may occasionally not appear until a subsequent edit lands on the same instance. This doesn't affect `standalone` deployments or local development (single process). If it matters for your setup, use a `standalone` deployment for live-editing sessions.

**Requires a live server at request time — does not work under `output: 'export'`.** Use `LocalessClientDocument` instead there; see "Client-Side Fallback for Static Export" below.

### Client-Side Fallback for Static Export

`LocalessClientDocument` (also from `/rsc`) is the client-side re-render fallback for `output: 'export'`, where no server exists at request time to run a Server Action against. It's the same implementation as the default SPA export's `LocalessDocument` — a Client Component holding its own state, re-rendering on `window.localess` events.

Because Next.js App Router bundles Server and Client Components into separate module graphs, a `localessInit({ enableSync: true, components })` call made only in a Server Component populates neither the component registry nor the `enableSync` flag in the Client Component module graph that `LocalessClientDocument` actually runs in — both live in module-scope state, and that state is a separate instance per graph. This holds under `output: 'export'` exactly as much as under `default`/`standalone`: static-export Client Components still hydrate and run their effects normally in the browser (see the [Next.js static export docs](https://nextjs.org/docs/app/guides/static-exports#client-components)) — the module-graph split, not the output mode, is what makes a second registration necessary.

Call `localessInit` a **second time**, from inside the Client Component boundary that renders `LocalessClientDocument`, using a **public token** — read-only, scoped to published content and translations only, safe to expose client-side (unlike the secret token used for the server-side call above). See `docs/decisions/001-server-side-only.md` for the full token-secrecy policy this exception is documented under.

```tsx
// app/[locale]/page-client.tsx
'use client';
import { localessInit, LocalessClientDocument } from "@localess/react/rsc";
import { components } from "@/localess.config"; // the same map passed to localessInit server-side

localessInit({
  origin: process.env.NEXT_PUBLIC_LOCALESS_ORIGIN!,   // same origin as the server-side call
  spaceId: process.env.NEXT_PUBLIC_LOCALESS_SPACE_ID!, // same spaceId as the server-side call
  token: process.env.NEXT_PUBLIC_LOCALESS_PUBLIC_TOKEN!, // a public token — never the secret one
  enableSync: true,
  components,
});

export default function PageClient({ content }) {
  return <LocalessClientDocument document={content} />;
}
```

This is a plain second call to the same `localessInit` you already use server-side — no separate function to learn. The server-side call keeps using the secret token (for build-time data fetching); this client-side call uses the public token, and its `components`/`enableSync` populate the *client* module graph that `LocalessClientDocument` actually reads from.

Use this only when you specifically need live editing on a statically-exported build. For `default`/`standalone`, prefer the primary `LocalessDocument` above — it needs no client-side registration at all.

### Vite Plugin for SSR Frameworks

For Vite-based SSR frameworks (TanStack Start, React Router v7 framework
mode, Remix Vite), `@localess/react/vite` automates the two-`localessInit`-calls
pattern above: one Vite plugin, one config object, one `localessInit()` call
generated identically for every build graph.

> **Known gap:** `token` here is shipped to the browser bundle as well as the
> SSR graph — there is currently no secret/public token split for this
> plugin (unlike the manual `LocalessClientDocument` pattern above, which
> does have one via `publicToken`). Treat `token` as a public value when
> using `localess()`, until a scoped/public-token mechanism replaces this.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { localess } from '@localess/react/vite';

export default defineConfig({
  plugins: [
    localess({
      origin: process.env.LOCALESS_ORIGIN!,
      spaceId: process.env.LOCALESS_SPACE_ID!,
      token: process.env.LOCALESS_TOKEN!, // shipped to the SSR graph AND the browser bundle
      enableSync: true,
      componentsDir: 'src/components/localess',        // default: 'src'
      components: { 'hero-section': './HeroOverride.tsx#HeroOverride' }, // optional, overrides auto-registration
    }),
  ],
});
```

Then, anywhere in your app:

```ts
import 'virtual:localess-init';
import { getLocalessClient } from '@localess/react';

const content = await getLocalessClient().getContentBySlug('home', { locale });
```

`virtual:localess-init` resolves to the same `localessInit()` call regardless
of which Vite build graph imports it — both the SSR/server graph and the
client graph get `token`. Every `.tsx`/`.jsx` file under `componentsDir`
is auto-registered under its kebab-cased filename (`hero-section.tsx` ->
`'hero-section'`) — matching the schema-key convention above. `components`
overrides take an exact key (no case transformation) and a file path relative
to `componentsDir`, for cases where the schema key doesn't match a
kebab-cased filename, or the file lives outside `componentsDir`. A bare path
assumes a default export; suffix it with `#ExportName` (e.g.
`'./HeroOverride.tsx#HeroOverride'`) to import a named export instead.

Only use the manual `components` two-`localessInit`-calls pattern above
directly if you're not on a Vite-based framework, or need control the plugin
doesn't expose.

### Static Prerendering (SSG): Two Client Instances Are Expected

When a Vite-based framework prerenders pages ahead of time (React Router v7's
`ssr: false` + `prerender`, TanStack Start's `prerender: { enabled: true }`),
you end up constructing a `localessClient` **twice**, in two different
places, and that's correct — not a bug to dedupe into one instance.

1. **Config-resolution time.** Before any page can be prerendered, the build
   tool needs the *list* of paths to render. For a static/dynamic route (a
   splat/catch-all matching arbitrary CMS slugs), that list doesn't exist
   until you fetch it — so the framework's config file constructs its own
   `localessClient` (from `@localess/react/ssr` — never `@localess/client`
   directly, see below) and calls `getLinks()` to build the path list. This
   runs as plain Node code before any Vite plugin or virtual module exists;
   `virtual:localess-init` isn't resolvable yet, so there's no singleton to
   reuse.
2. **Module-graph execution time.** Once the path list is known, the build
   tool renders each path by executing your actual route/loader code inside
   the SSR module graph — where `import 'virtual:localess-init'` runs,
   calling `localessInit()`, which builds a second `localessClient` and
   stores it as the singleton `getLocalessClient()` reads from.

These are separate Node module instantiations in separate lifecycle stages —
there's no reference from stage 1 that could be handed to stage 2, since
stage 2's module graph is built fresh by the framework's SSR compiler. This
mirrors Next.js's `generateStaticParams()` running independently of the
page's own data fetch. It's also not wasteful in requests: `getLinks()`
(path enumeration) and `getContentBySlug()` (per-page content) are different
endpoints, so nothing is fetched twice — only the `{ origin, spaceId, token }`
literal is duplicated between the two call sites, which you can factor into
one shared constant if you want a single source of truth.

**React Router v7 (framework mode)** — the path-enumeration client lives in
`react-router.config.ts`'s `prerender()`:

```ts
// react-router.config.ts
import type { Config } from '@react-router/dev/config';
import { localessClient } from '@localess/react/ssr'; // not @localess/client directly

async function getPrerenderPaths(): Promise<string[]> {
  const client = localessClient({ origin: '...', spaceId: '...', token: '...' });
  const links = await client.getLinks({ kind: 'DOCUMENT' });
  return Object.values(links).map(link => `/${link.fullSlug}`);
}

export default {
  ssr: false,
  async prerender() {
    return getPrerenderPaths();
  },
} satisfies Config;
```

The second `localessClient` is built by `localess()` in `vite.config.ts`,
as shown above.

**TanStack Start** — both the path-enumeration client and `localess()`
live in the same `vite.config.ts`, since TanStack Start's `prerender.pages`
option is passed directly to `defineConfig`'s plugins array:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { localessClient } from '@localess/react/ssr'; // not @localess/client directly
import { localess } from '@localess/react/vite';

async function getPrerenderPaths(): Promise<string[]> {
  const client = localessClient({ origin: '...', spaceId: '...', token: '...' });
  const links = await client.getLinks({ kind: 'DOCUMENT' });
  return Object.values(links).map(link => `/${link.fullSlug}`);
}

export default defineConfig(async () => {
  const pages = await getPrerenderPaths();
  return {
    plugins: [
      localess({ origin: '...', spaceId: '...', token: '...' }),
      tanstackStart({ prerender: { enabled: true }, pages: pages.map(path => ({ path })) }),
    ],
  };
});
```

**Next.js `output: 'export'`** doesn't use `@localess/react/vite` at all (it's
not Vite-based), and — unlike the two Vite frameworks above — it genuinely
can share **one** client instance between path enumeration and page
rendering. `generateStaticParams()` and the page component are both part of
the same route module, evaluated once in the same Node process by Next's
build, so a plain module-level constant works:

```ts
// shared/utils/locales.ts
export const localessClient = localessInit({ origin: '...', spaceId: '...', token: '...' });
```

```ts
// app/[[...path]]/page.tsx
import { localessClient } from '@/shared/utils/locales';

export async function generateStaticParams() {
  const links = await localessClient.getLinks({ kind: 'DOCUMENT' });
  // ...build path list from links
}

async function fetchData(locale: string | undefined, slug: string) {
  return localessClient.getContentBySlug(slug, { locale });
}
```

The reason this works for Next but not for React Router v7 / TanStack Start
is Next's module-caching model: importing the same module twice within one
build process returns the same evaluated instance. The Vite frameworks'
config-resolution phase and SSR module-graph phase are not the same module
graph, so no import can bridge them. See "Client-Side Fallback for Static
Export" above for the separate client-side registration piece that's
specific to Next's static export (live editing in the browser).

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

### Advanced: Server-Patch Alternative (`default` / `standalone` only)

The patterns above re-render on the client using React state (they're for the default SPA export and the `LocalessClientDocument` fallback, not the primary `/rsc` `LocalessDocument`, which is already server-driven — see "How `/rsc` Live Sync Works"). An alternative for the SPA/client-side case — useful if you want to avoid registering components in the client bundle at all (see "Client-Side Fallback for Static Export") — is to re-render server-side and patch the DOM, the same approach `@localess/astro` uses for its `livePreview` tier:

1. On a Visual Editor `input`/`change` event, `POST` the updated `data` to a Next.js Route Handler (e.g. `app/api/localess-preview/route.ts`).
2. In that Route Handler, re-render your page's content server-side with the new data (via RSC) and return the resulting HTML.
3. On the client, debounce the event, `fetch` the Route Handler, and use a DOM-diffing library such as `morphdom` to patch `document.body` in place, keyed by the `data-ll-id` attribute (matching how `localessEditable` marks elements):

```tsx
import morphdom from 'morphdom';

async function patchWithUpdatedContent(data: unknown) {
  const response = await fetch(location.href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const html = await response.text();
  const newBody = new DOMParser().parseFromString(html, 'text/html').body;

  morphdom(document.body, newBody, {
    getNodeKey(node) {
      return node.nodeType === 1 ? (node as Element).getAttribute('data-ll-id') ?? undefined : undefined;
    },
  });
}
```

**This requires a server running at request time and does not work under `output: 'export'`** — there is no server to handle the `POST` in a fully static build. Most apps don't need this: the client-side re-render patterns above already work under all three output modes. Reach for this only if avoiding a client-side component registry specifically matters for your build.

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
export { getComponent, getFallbackComponent, isSyncEnabled }
export { LocalessComponent, LocalessDocument }
export { renderRichTextToReact, resolveAsset }
export { useLocaless }
export { findLink }
export { localessEditable, localessEditableField }  // re-exported from @localess/client
export { isBrowser, isServer, isIframe }             // re-exported from @localess/client
export { LocalessApiError }                          // re-exported from @localess/client; thrown by getContentBySlug/getContentById on a non-2xx response
export type { LocalessClient, LocalessOptions, LocalessComponentProps }
export type { AssetTransformParams }
export type { Content, ContentData, ContentMetadata, ContentDataSchema, ContentDataField }
export type { ContentAsset, ContentRichText, ContentLink, ContentReference }
export type { Links, References, Translations }
export type { LocalessSync, EventToApp, EventCallback, EventToAppType }

// @localess/react/ssr — excludes sync/hooks (see Export Variants section)
// @localess/react/rsc — extends /ssr with a server-safe LocalessDocument, useLocaless, and isSyncEnabled
```

## Common Mistakes

- **Wrong import path.** Using `@localess/react` in a Next.js App Router project instead of `@localess/react/rsc` causes `'use client'` directive conflicts. Use `/rsc` for App Router.
- **Using `@localess/react/ssr` when you need sync.** The `/ssr` export deliberately excludes all sync and browser-only code. If you need live Visual Editor editing, use `/rsc`.
- **Using `LocalessClientDocument` without registering components client-side.** Only relevant if you deliberately opted into the `output: 'export'` fallback — the primary `LocalessDocument` needs no client-side registration at all. See "Client-Side Fallback for Static Export" above.
- **Calling `localessInit()` in a Client Component.** It is safe in Server Components — call it once in the root layout, never in `'use client'` files.
- **Not passing `links`/`references` down the tree.** Child `LocalessComponent`s need them for resolved data. Always pass them through every level.
- **Enabling sync in production.** `enableSync: process.env.NODE_ENV !== 'production'` — the sync script is only useful inside the Localess editor iframe.
