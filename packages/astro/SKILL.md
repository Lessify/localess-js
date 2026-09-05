# @localess/astro

Astro integration layer for Localess. A full Astro Integration (`localess()` in `astro.config.mjs`), matching `@storyblok/astro`'s architecture — see [ADR 006](../../docs/decisions/006-astro-integration-architecture.md) for why and how it differs where Localess's constraints require it.

**Peer dependency:** Astro 6 or 7 (`astro@^6.0.0 || ^7.0.0`). **Node.js:** >= 24.

## Installation

```bash
npm install @localess/astro
```

## Configuration

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { localess } from '@localess/astro';

export default defineConfig({
  integrations: [
    localess({
      origin: process.env.LOCALESS_ORIGIN,
      spaceId: process.env.LOCALESS_SPACE_ID,
      token: process.env.LOCALESS_TOKEN,
      enableSync: true,
    }),
  ],
});
```

`localess()` (alias `localessIntegration()`) takes `LocalessOptions` — the `@localess/client` options plus Astro-specific ones:

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `origin` | `string` | — | Localess instance URL (protocol + host + port). |
| `spaceId` | `string` | — | Space ID. Not a secret — also used to validate live-preview requests. |
| `token` | `string` | — | API token. **Secret** — see below. |
| `version` | `'draft'` | published | Fetch the latest draft instead of published content. |
| `debug` | `boolean` | `false` | Client debug logging. |
| `cacheTTL` | `number \| false` | `300` | Client response cache TTL in seconds; `false` disables caching. |
| `componentsDir` | `string` | `'src'` | Directory scanned for schema components (`<componentsDir>/**/*.astro`). |
| `components` | schema key → component path (relative to `componentsDir`) | — | Explicit map merged with auto-discovery. See "Component registry". |
| `enableFallbackComponent` | `boolean` | `false` | Render a fallback component for unknown schema keys instead of throwing. |
| `customFallbackComponent` | `string` | built-in `FallbackComponent.astro` | Path (relative to `componentsDir`) to your own fallback component. |
| `enableSync` | `boolean` | `false` | Reload-based Visual Editor sync. Ignored when `livePreview` is `true`. |
| `livePreview` | `boolean` | `false` | SSR-only live-patching Visual Editor sync. Requires `output: 'server'`. |

### Token handling

`token` is **secret-only**. `@localess/astro` has not been reworked for Localess's public tokens (see ADR 001) — never pass a token into client-side code or suggest a browser-side client for this package. The integration keeps the token server-side: the `LocalessClient` is built in a `virtual:localess-init` module that is injected only via Astro's `page-ssr` script stage, and the token is never written into `virtual:localess-options` (which `.astro` frontmatter and the live-preview middleware read). Only `origin` and `spaceId` reach browser-side scripts (for `loadLocalessSync(origin)` and `window.__localessSpaceId`). Under static output, the token is only read at build time.

## Rendering content

```astro
---
import { getLocalessClient } from '@localess/astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';

const content = await getLocalessClient().getContentBySlug('home');
---

<LocalessDocument document={content} />
```

`getLocalessClient()` returns the `LocalessClient` the integration built from your `astro.config.mjs` options (it throws if the integration isn't configured). `LocalessDocument` takes a single prop, `document: Content`, and throws if `document.data` is missing; it renders `document.data` through `LocalessComponent`, forwarding `document.links`, `document.references`, and `document.assets`.

To render a nested block directly (e.g. inside a custom component), use `LocalessComponent`:

```astro
---
import LocalessComponent from '@localess/astro/LocalessComponent.astro';
---

{data.body.map(item => <LocalessComponent data={item} links={links} references={references} assets={assets} />)}
```

`LocalessComponent`'s props are `LocalessComponentProps`: `data: ContentData` (required — throws if missing), optional `links: Links`, `references: References`, `assets: Assets`, plus any extra props. It resolves the component registered for `toCamelCase(data._schema)` (falling back to the fallback component when enabled, otherwise throwing) and renders it with `data`/`links`/`references`/`assets`, the `localessEditable(data)` attributes (`data-ll-id`, `data-ll-schema`), and the extra props spread onto it.

## Component registry

Components auto-register from `<componentsDir>/**/*.astro` (default `componentsDir: 'src'`, so `src/**/*.astro`), keyed by file name — `HeroSection.astro` registers as `heroSection`. Merge in an explicit map via the `components` option; values are component paths relative to `componentsDir` (the `.astro` extension is optional):

```js
localess({
  // ...
  componentsDir: 'src/components/localess',
  components: { 'hero-section': 'sections/Hero' }, // resolves src/components/localess/sections/Hero.astro
});
```

A mapped path that doesn't resolve throws at build time, unless `enableFallbackComponent` is `true`, in which case the entry is skipped. Both the registry key and `_schema` are compared through `toCamelCase()` — a file named `HeroSection.astro` matches `_schema: 'hero-section'` automatically.

## Writing components

Type a registered component's `Props` with `LocalessSchemaProps<T>` — the same generic shape `@localess/react`'s `LocalessSchemaProps<T>` uses, so `data`/`links`/`references`/`assets` stay typed against your own content type (`LocalessComponentProps` is the built-in renderer's own props type, not the schema-component contract):

```astro
---
import { localessEditable, localessEditableField } from '@localess/astro';
import type { LocalessSchemaProps } from '@localess/astro';
import type { HeroSection } from './.localess/localess'; // your generated content type

export type Props = LocalessSchemaProps<HeroSection>;

const { data } = Astro.props;
---

<section {...localessEditable(data)}>
  <h1 {...localessEditableField<HeroSection>('title')}>{data.title}</h1>
</section>
```

`localessEditable(data)` emits `data-ll-id`/`data-ll-schema`; `localessEditableField(name)` emits `data-ll-field`. Both are harmless when sync is off. `LocalessComponent` already spreads `localessEditable(data)` onto your component, so you only need it yourself when your root element doesn't receive those props.

## Fallback component

```js
localess({
  // ...
  enableFallbackComponent: true,
  customFallbackComponent: 'localess/CustomFallback', // optional, relative to componentsDir; omit to use the built-in FallbackComponent.astro
});
```

The built-in `FallbackComponent.astro` (also importable from `@localess/astro/FallbackComponent.astro`) accepts `LocalessSchemaProps` and renders a "Component could not be found for schema …" notice. A custom fallback must accept the same props; if its path doesn't resolve the build throws.

## Visual Editor sync

Two tiers, mutually exclusive (`livePreview` wins when both are set):

- `enableSync: true` — loads the Localess sync script from `origin`, then on any `input`/`change` event debounces (~500ms) and reloads the page. Works under both SSR and static output.
- `livePreview: true` — SSR-only (`output: 'server'`; the integration throws at config-setup time otherwise). `save`/`publish`/`unpublish` reload; `input`/`change` debounce (~500ms), POST the updated content to the current page, and `morphdom`-patch the response into the live DOM, keyed by `data-ll-id`. The integration wires this up for you: it injects a page script that calls `handleLocalessMessage` and registers the `@localess/astro/middleware` middleware (`order: 'pre'`), which accepts a preview POST only when it is same-origin (`Sec-Fetch-Site: same-origin`) and its body's `spaceId` matches the one passed to `localess()`.

With `livePreview`, read the draft payload in page frontmatter with `getLivePayload(Astro)` and prefer it over a fresh fetch. The payload carries only `data` (no `links`/`references`/`assets`), and is empty on ordinary requests:

```astro
---
import { getLivePayload, getLocalessClient } from '@localess/astro';
import LocalessComponent from '@localess/astro/LocalessComponent.astro';

const preview = await getLivePayload(Astro);
const content = await getLocalessClient().getContentBySlug('home');
const data = preview.data ?? content.data;
---

<LocalessComponent data={data} links={content.links} references={content.references} assets={content.assets} />
```

## Dev toolbar

The integration always registers a "Localess" Astro dev-toolbar app (entrypoint `@localess/astro/toolbarApp`) with links to the Localess docs and the issue tracker. It has no configuration.

## Rich text

```astro
---
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
---

<LocalessRichText content={data.body} />
```

Props: `content: LocalessRichTextInput` (a rich text document, node, or node array — `ContentRichText` values fit), and optional `renderers`. Built on `@localess/richtext` — no TipTap at runtime. Supports headings 1–6, paragraphs, bold/italic/strike/underline/code, ordered/unordered lists, code blocks, and links. Per-node customization via the string-based `renderers` prop; each renderer receives the node (with `attrs`) plus pre-rendered `children` HTML:

```astro
<LocalessRichText content={data.body} renderers={{ paragraph: ({ children }) => `<p class="prose">${children}</p>` }} />
```

`renderRichTextToHtml(content, { renderers? })` and its alias `renderLocalessRichTextToHtml` are exported from `@localess/astro` for standalone rendering. Link `href`s pass a protocol allowlist (`javascript:`/`data:` become empty); unknown node types are skipped with a warning (silenced when `NODE_ENV === 'production'`) unless a renderer for that type is provided.

## Assets

```astro
---
import { resolveAsset } from '@localess/astro';
---

<img src={resolveAsset(data.heroImage, { w: 800 })} alt={data.title} />
```

`resolveAsset(asset: ContentAsset, params?: AssetTransformParams)` delegates to the client's `assetLink`. A `ContentAsset` is `{ kind: 'ASSET', uri }` — it carries no alt text; take that from another field. Transform params include `w`, `h`, `q`, `f`, `download`, `thumbnail`.

## Error handling

`getContentBySlug`/`getContentById` throw `LocalessApiError` (re-exported from `@localess/astro`) on a non-2xx API response — check `error.status` to distinguish a missing slug (404) from other failures:

```astro
---
import { getLocalessClient, LocalessApiError } from '@localess/astro';

let content;
try {
  content = await getLocalessClient().getContentBySlug(slug);
} catch (error) {
  if (error instanceof LocalessApiError && error.status === 404) {
    Astro.response.status = 404;
    return Astro.rewrite('/404');
  }
  throw error;
}
---
```

## Import paths — subpath exports required for `.astro` files

`LocalessComponent`, `LocalessDocument`, `LocalessRichText`, `FallbackComponent` are `.astro` files and **cannot** be imported from `@localess/astro`'s default entry point. Import them (default export) from their dedicated subpaths:

```typescript
import LocalessComponent from '@localess/astro/LocalessComponent.astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
import FallbackComponent from '@localess/astro/FallbackComponent.astro';
```

Everything else imports from the default entry point (`@localess/astro`) — never from `@localess/client` or `@localess/richtext` directly:

- Integration and helpers: `localess`/`localessIntegration`, `getLocalessClient`, `getLivePayload`, `resolveAsset`, `handleLocalessMessage`, `toCamelCase`, `renderRichTextToHtml`/`renderLocalessRichTextToHtml`.
- Browser-safe sync utilities: `loadLocalessSync`, `localessEditable`, `localessEditableField`, `isBrowser`, `isIframe`.
- Errors: `LocalessApiError`.
- `localessClient` — server-only factory, re-exported for the integration's generated `virtual:localess-init` module; in app code use `getLocalessClient()` instead.
- Types: `LocalessOptions`, `LocalessComponentProps`, `LocalessSchemaProps`, `LocalessClient`, `LocalessSync`, `EventToApp`, `EventToAppOf`, `EventToAppType`, `EventCallback`; model types `Content`, `ContentData`, `ContentDataSchema`, `ContentDataField`, `ContentMetadata`, `ContentAsset`, `ContentLink`, `ContentReference`, `ContentRichText`, `Assets`, `AssetMetadata`, `AssetTransformParams`, `Links`, `References`; rich text types `LocalessRichTextInput`, `LocalessRichTextDocument`, `LocalessRichTextNode`, `LocalessRichTextMark`.

The `@localess/astro/middleware` and `@localess/astro/toolbarApp` subpaths exist for the integration's own `addMiddleware`/`addDevToolbarApp` entrypoints — you don't import them yourself.

## componentNaming

| Strategy | `HeroBanner` / `hero-banner` / `hero_banner` -> |
|---|---|
| `exact` *(default)* | unchanged — matches only an identical spelling |
| `camelCase` | `heroBanner` |
| `PascalCase` | `HeroBanner` |
| `kebab-case` | `hero-banner` |
| `snake_case` | `hero_banner` |
| `lowercase` | `herobanner` |

Applied to **both** the registry key and `data._schema`. Collisions under a non-`exact` strategy log
a warning and keep the first registration.

Strategy names only (options are `JSON.stringify`d into a virtual module). **Changed in v4:** the
default was camelCase, it is now `exact`; set `componentNaming: 'camelCase'` to restore.
