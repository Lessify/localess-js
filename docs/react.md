# @localess/react Reference

React integration layer for Localess. Builds on `@localess/client` and adds a component registry, Visual Editor sync, rich text rendering, and asset resolution.

**Peer dependencies:** React 17, 18, or 19 + react-dom.

## Export Variants

`@localess/react` ships three runtime entry points plus two build-time ones. **Choosing the wrong one is the most common mistake.**

| Import path | Use case | Sync / hooks available |
|---|---|---|
| `@localess/react` | SPA or fully client-rendered app | Yes |
| `@localess/react/ssr` | SSR or Next.js `output: 'export'` (static) | No |
| `@localess/react/rsc` | Next.js App Router (React Server Components) | Yes (Server-Action-driven `LocalessDocument`, plus client hooks) |
| `@localess/react/vite` | `vite.config.ts` of TanStack Start / React Router v7 / Remix Vite — see "Vite Plugin for SSR Frameworks" | via generated `localessInit({ enableSync })` |
| `@localess/react/vite/virtual-modules` | tsconfig `compilerOptions.types` — ambient declarations for `virtual:localess-init` / `virtual:localess-components` | — |

`@localess/react/rsc`'s `LocalessDocument` needs a live server at request time (its live sync is Server-Action-driven) and works under `default`/`standalone`, but not `output: 'export'` — use the default export's client-side `LocalessDocument` there instead (see "Client-Side Fallback for Static Export"). `@localess/react/ssr` remains the right choice when you deliberately want to exclude all sync code for the smallest bundle.

### What `@localess/react/ssr` excludes

The smallest bundle. It exports `LocalessServerComponent` / `LocalessServerDocument` (server-safe, no sync attributes) in place of the default `LocalessComponent` / `LocalessDocument`, and does NOT include:
- `LocalessComponent` / `LocalessDocument` (available from the default export and `/rsc`)
- `useLocaless` hook (requires `'use client'`)
- `isSyncEnabled`, `localessSyncOn`, `localessSyncOnChange`, `localessSyncReady` (not meaningful without live editing)

`localessEditable`, `localessEditableField`, `isBrowser`, `isIframe`, `isServer`, `loadLocalessSync`, `buildAssetQueryString`, `LocalessRichText` / `renderRichText`, `LocalessApiError`, and the sync event types (`LocalessSync`, `EventToApp`, `EventToAppOf`, `EventCallback`, `EventToAppType`) ARE included — they're cheap to bundle and harmless outside a client context. `/ssr` also re-exports `localessClient`, the raw `@localess/client` factory, for build-time scripts (see "Static Prerendering").

`isSyncConfigured` and `getOrigin` are only on the default export.

### What `@localess/react/rsc` adds back

Re-exports everything from `/ssr` (including `localessClient`), plus:
- `LocalessComponent` — server-safe (no `'use client'`), usable directly in a Server Component
- `LocalessDocument` — the live-editing entry point for App Router: a Server Component whose live sync is driven by a Server Action, with no client-side component registration needed. Requires a live server at request time (not usable under `output: 'export'`). This is a different implementation from the default export's `LocalessDocument`, which `/rsc` does **not** export
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

> **Security:** a secret `token` is safe here only because this runs server-side. Never expose it to the browser. The one exception is a Localess **public token** (read-only, published content and translations only), which may be passed to a second, client-side `localessInit()` — see "Client-Side Fallback for Static Export".

`localessInit` returns the created `LocalessClient`. `components` / `fallbackComponent` are typed `AnyLocalessComponent` (`React.ComponentType<LocalessSchemaProps<any>>`) so that components typed per schema (`LocalessSchemaProps<HeroSection>`) are assignable; the registry itself is stored as `React.ElementType`.

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

Looks up `data._schema` in the registry and renders the matching component. Server-safe, no sync subscription; it always spreads `localessEditable(data)` (`data-ll-id` / `data-ll-schema`) onto the rendered component so the Visual Editor can target it. Props: `data`, `links?`, `references?`, `assets?`, `ref`, and any extra props (forwarded). Type: `LocalessComponentProps<T>`.

```tsx
import { LocalessComponent } from "@localess/react";

<LocalessComponent
  data={content.data}
  links={content.links}
  references={content.references}
  assets={content.assets}
/>
```

Rendering logic:
1. Read `data._schema` as registry key
2. Render registered component with `data`, `links`, `references`, `assets`, the `data-ll-*` attributes, and any extra props
3. If not found → try `fallbackComponent` (receives the same props, minus the `data-ll-*` attributes)
4. If no fallback → render error message

### `LocalessDocument` — static renderer + live sync

Accepts the full `Content<T>` as `document`, delegates rendering to `LocalessComponent` (passing `data`, `assets`, `links`, `references`), and adds live sync. Does not fetch content — pass server-preloaded data as props. There are two implementations:

- **`@localess/react/rsc`** — a Server Component. Live sync is driven by a Server Action (see "How `/rsc` Live Sync Works"). Use this in Next.js App Router.
- **`@localess/react`** — a client-side component: holds `document.data` in `useState` and subscribes to `input`/`change` via `localessSyncOnChange` when `enableSync` is active. It calls React hooks, so render it inside a `'use client'` boundary.

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
| Works in RSC | Yes | `/rsc` version: yes (Server Component). Default-export version: requires a Client Component boundary | No (`'use client'`) |
| Best for | Static SSR | Server-preloaded + sync | SPA / client-rendered |

## Writing Components

Components receive `data`, `links`, `references`, and `assets` as props (`LocalessSchemaProps<T>`). Always spread editable attributes for Visual Editor support:

```tsx
import { localessEditable, localessEditableField, resolveAsset, LocalessComponent } from "@localess/react";
import type { LocalessSchemaProps } from "@localess/react";
import type { HeroSection } from "./.localess/localess";

const HeroSection = ({ data, links, references }: LocalessSchemaProps<HeroSection>) => (
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

`LocalessDocument` from `/rsc` is a Server Component. Live editing is driven by a Server Action shipped inside the SDK: a small `'use client'` listener (rendered by `LocalessDocument`, given `document.id`, the configured `origin`, and the raw `enableSync` flag via `isSyncConfigured()`) loads the sync script when running inside the Visual Editor iframe and calls the action on every `input`, `change`, `save`, `publish`, and `unpublish` event. On `input`/`change` the action stashes the edited data in an in-process cache keyed by `Content.id`; on `save`/`publish`/`unpublish` it clears that entry (the API is the source of truth again). It then calls `next/cache`'s `revalidatePath` (only when `process.env.NEXT_RUNTIME` is set), and Next.js refreshes the Server Component tree — `LocalessDocument` consumes the cached edit (one-shot) and re-renders using the server's own component registry. **No client-side component registration is needed** — `localessInit({ components })` once, server-side, is enough:

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

**Requires a live server at request time — does not work under `output: 'export'`.** Use the default export's client-side `LocalessDocument` instead there; see "Client-Side Fallback for Static Export" below.

### Client-Side Fallback for Static Export

The default export's `LocalessDocument` (`import { LocalessDocument } from "@localess/react"`) is the client-side re-render fallback for `output: 'export'`, where no server exists at request time to run a Server Action against. It is a client-side component holding its own state (`useState`) and re-rendering on `window.localess` `input`/`change` events. (Earlier releases re-exported it from `/rsc` under the alias `LocalessClientDocument`; that alias no longer exists — import from `@localess/react` directly.)

Because Next.js App Router bundles Server and Client Components into separate module graphs, a `localessInit({ enableSync: true, components })` call made only in a Server Component populates neither the component registry nor the `enableSync` flag in the Client Component module graph that this `LocalessDocument` actually runs in — both live in module-scope state, and that state is a separate instance per graph. This holds under `output: 'export'` exactly as much as under `default`/`standalone`: static-export Client Components still hydrate and run their effects normally in the browser (see the [Next.js static export docs](https://nextjs.org/docs/app/guides/static-exports#client-components)) — the module-graph split, not the output mode, is what makes a second registration necessary.

Call `localessInit` a **second time**, from inside the Client Component boundary that renders `LocalessDocument`, using a **public token** — read-only, scoped to published content and translations only, safe to expose client-side (unlike the secret token used for the server-side call above). See `docs/decisions/001-server-side-only.md` for the full token-secrecy policy this exception is documented under.

```tsx
// app/[locale]/page-client.tsx
'use client';
import { localessInit, LocalessDocument } from "@localess/react";
import { components } from "@/localess.config"; // the same map passed to localessInit server-side

localessInit({
  origin: process.env.NEXT_PUBLIC_LOCALESS_ORIGIN!,   // same origin as the server-side call
  spaceId: process.env.NEXT_PUBLIC_LOCALESS_SPACE_ID!, // same spaceId as the server-side call
  token: process.env.NEXT_PUBLIC_LOCALESS_PUBLIC_TOKEN!, // a public token — never the secret one
  enableSync: true,
  components,
});

export default function PageClient({ content }) {
  return <LocalessDocument document={content} />;
}
```

This is a plain second call to the same `localessInit` you already use server-side — no separate function to learn. The server-side call keeps using the secret token (for build-time data fetching); this client-side call uses the public token, and its `components`/`enableSync` populate the *client* module graph that this `LocalessDocument` actually reads from. All entry points share the same `core/client` module, so `localessInit` from `@localess/react` and `getLocalessClient` from `@localess/react/ssr` read the same state within one module graph.

Use this only when you specifically need live editing on a statically-exported build. For `default`/`standalone`, prefer `/rsc`'s `LocalessDocument` above — it needs no client-side registration at all.

### Vite Plugin for SSR Frameworks

For Vite-based SSR frameworks (TanStack Start, React Router v7 framework
mode, Remix Vite), `@localess/react/vite` automates the two-`localessInit`-calls
pattern above: one Vite plugin, one config object, one `localessInit()` call
generated identically for every build graph.

> **Known gap:** `token` here is shipped to the browser bundle as well as the
> SSR graph — there is currently no secret/public token split for this
> plugin (unlike the manual two-call pattern above, where the client-side
> `localessInit()` receives a public token and the server-side one keeps the
> secret). Use a public token with `localess()`, until a scoped/public-token
> mechanism replaces this.

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

For that bare import to type-check, add the ambient declarations to your tsconfig (the same way you add `vite/client`):

```json
{ "compilerOptions": { "types": ["vite/client", "@localess/react/vite/virtual-modules"] } }
```

`localess(options)` takes `LocalessOptions`: `origin`, `spaceId`, `token`
(required — it throws if any is missing), optional `version: 'draft'`,
`cacheTTL`, `debug`, `enableSync` (all forwarded verbatim to the generated
`localessInit()`), `componentsDir` (default `'src'`), and `components`
(`Record<schemaKey, path>`). It returns two Vite plugins
(`vite-plugin-localess-components`, `vite-plugin-localess-init`).

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
import { LocalessComponent, localessEditable, localessSyncOn } from "@localess/react/rsc";

export function PageClient({ initialContent }) {
  const [pageData, setPageData] = useState(initialContent.data);

  useEffect(() => {
    // No-op unless isSyncEnabled(); waits for localessSyncReady() internally.
    // `event` is narrowed to the 'input' | 'change' variant (has `data`).
    localessSyncOn(['input', 'change'], (event) => {
      setPageData(event.data);
    });
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

The patterns above re-render on the client using React state (they're for the default export's client-side `LocalessDocument` / `useLocaless` and the static-export fallback, not `/rsc`'s `LocalessDocument`, which is already server-driven — see "How `/rsc` Live Sync Works"). An alternative for the SPA/client-side case — useful if you want to avoid registering components in the client bundle at all (see "Client-Side Fallback for Static Export") — is to re-render server-side and patch the DOM, the same approach `@localess/astro` uses for its `livePreview` tier:

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

Converts a `ContentAsset` to a full URL (`{origin}/api/v1/spaces/{spaceId}/assets/{uri}`, plus a query string built by `buildAssetQueryString(params)`). Configured automatically from `origin` + `spaceId` in `localessInit`.

```typescript
import { resolveAsset } from "@localess/react";
const imageUrl = resolveAsset(data.heroImage);
const imageUrl = resolveAsset(data.heroImage, { w: 800, h: 600, f: 'webp', q: 90 });
const thumb    = resolveAsset(data.video, { w: 400, thumbnail: true });
```

See `AssetTransformParams` table in [docs/client.md](client.md#asset-transform-parameters).

### Rich Text — `<LocalessRichText>` and `renderRichText(content, options?)`

Renders Localess `ContentRichText` (Tiptap JSON) to a native React node tree — no TipTap at runtime, safe in SPA, SSR, and RSC. Built on `@localess/richtext` (see [docs/richtext.md](richtext.md)).

```tsx
import { LocalessRichText, renderRichText } from "@localess/react";

<LocalessRichText content={data.body} />
<article>{renderRichText(data.body)}</article>
```

Per-node/per-mark overrides are React components receiving the node's fields plus `children`:

```tsx
<LocalessRichText
  content={data.body}
  renderers={{ link: ({ attrs, children }) => <Link href={attrs.href}>{children}</Link> }}
/>
```

Supported elements: headings (h1–h6), paragraphs, bold, italic, strikethrough, underline, ordered/unordered lists, code, code blocks, links. Link `href`s pass a protocol allowlist (`javascript:`/`data:` are stripped). Unknown node types are skipped with a dev-only warning unless a renderer for that type is provided.

## Accessing the Client

```typescript
import { getLocalessClient } from "@localess/react";
const client = getLocalessClient(); // throws if localessInit() not called
```

For a standalone client outside the singleton (build-time path enumeration), use `localessClient` from `@localess/react/ssr` — see "Static Prerendering" above.

### Sync helpers

- `isSyncEnabled()` — `true` only when `enableSync: true` was passed to `localessInit`, code is running in the browser, and the page is inside the Visual Editor iframe.
- `isSyncConfigured()` (default export only) — the raw `enableSync` flag without that gating. Read it server-side and pass it down as a prop when a Client Component (a separate module graph) needs to know.
- `localessSyncReady()` — resolves once the sync script has loaded (immediately when sync is off); never rejects.
- `localessSyncOn(event | event[], callback)` / `localessSyncOnChange(callback)` — subscribe to `window.localess` events; both no-op unless `isSyncEnabled()` and await `localessSyncReady()` internally. Event types: `input`, `change`, `save`, `publish`, `unpublish`, `pong`, `enterSchema`, `hoverSchema`, `leaveSchema`.

## Exports Reference

```typescript
// Default export (@localess/react)
export { localessInit, getLocalessClient, getOrigin }
export { getComponent, getFallbackComponent }
export { isSyncEnabled, isSyncConfigured, localessSyncReady, localessSyncOn, localessSyncOnChange }
export { LocalessComponent, LocalessDocument, LocalessRichText }   // LocalessDocument here = client-side, useState-based
export { renderRichText, resolveAsset }
export { useLocaless }
export { findLink, loadLocalessSync, buildAssetQueryString }        // re-exported from @localess/client
export { localessEditable, localessEditableField }                  // re-exported from @localess/client
export { isBrowser, isServer, isIframe }                             // re-exported from @localess/client
export { LocalessApiError }                          // re-exported from @localess/client; thrown by getContentBySlug/getContentById on a non-2xx response
export type { LocalessClient, LocalessClientOptions, LocalessOptions, AnyLocalessComponent }
export type { LocalessComponentProps, LocalessDocumentProps, LocalessRichTextProps, LocalessSchemaProps, UseLocalessOptions }
export type { LocalessReactRichTextRenderers, LocalessReactRichTextOptions }
export type { ContentFetchParams, LinksFetchParams, TranslationFetchParams, AssetTransformParams }
export type { Content, ContentData, ContentMetadata, ContentDataSchema, ContentDataField }
export type { ContentAsset, ContentRichText, ContentLink, ContentReference }
export type { Assets, Links, References, Translations }
export type { LocalessRichTextDocument, LocalessRichTextInput, LocalessRichTextMark, LocalessRichTextNode }
export type { LocalessSync, EventToApp, EventToAppOf, EventCallback, EventToAppType }

// @localess/react/ssr — no sync functions, no hooks, no client-side LocalessDocument
export { localessInit, getLocalessClient, localessClient, getComponent, getFallbackComponent, resolveAsset }
export { LocalessServerComponent, LocalessServerDocument, LocalessRichText, renderRichText }
export { findLink, loadLocalessSync, buildAssetQueryString, localessEditable, localessEditableField, isBrowser, isServer, isIframe }
export { LocalessApiError }
export type { LocalessServerComponentProps, LocalessServerDocumentProps /* + all shared types above */ }

// @localess/react/rsc — everything from /ssr, plus:
export { LocalessComponent, LocalessDocument /* Server Component, Server-Action sync */, useLocaless }
export { isSyncEnabled, localessSyncOn, localessSyncOnChange, localessSyncReady }
export type { LocalessDocumentProps }

// @localess/react/vite — build-time only
export { localess }                                  // (options: LocalessOptions) => Plugin[]
export type { LocalessOptions, LocalessInitOptions }

// @localess/react/vite/virtual-modules — ambient declarations only
declare module 'virtual:localess-init' {}
declare module 'virtual:localess-components' {}
```

## Common Mistakes

- **Wrong import path.** Rendering the default export's `LocalessDocument` (or calling `useLocaless`) from a Server Component fails — they call React hooks. Use `/rsc` for App Router; its `LocalessDocument` is a Server Component.
- **Using `@localess/react/ssr` when you need sync.** The `/ssr` export deliberately excludes all sync and browser-only code. If you need live Visual Editor editing, use `/rsc`.
- **Using the client-side `LocalessDocument` without registering components client-side.** Only relevant if you deliberately opted into the `output: 'export'` fallback — `/rsc`'s `LocalessDocument` needs no client-side registration at all. See "Client-Side Fallback for Static Export" above.
- **Calling `localessInit()` with the secret token in a Client Component.** Call it once in the root layout (Server Component). The only client-side call allowed is the static-export fallback, and it must use a public token.
- **Not passing `links`/`references` down the tree.** Child `LocalessComponent`s need them for resolved data. Always pass them through every level.
- **Enabling sync in production.** `enableSync: process.env.NODE_ENV !== 'production'` — the sync script is only useful inside the Localess editor iframe.
