# @localess/astro

Astro integration layer for Localess. A full Astro Integration (`localess()` in `astro.config.mjs`), matching `@storyblok/astro`'s architecture — see [ADR 006](../../docs/decisions/006-astro-integration-architecture.md) for why and how it differs where Localess's constraints require it.

**Peer dependency:** Astro 6 or 7.

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

`token` never reaches the browser — the integration builds the `LocalessClient` server-side only, via Astro's `page-ssr` script stage.

## Rendering content

```astro
---
import { getLocalessClient } from '@localess/astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';

const content = await getLocalessClient().getContentBySlug('home');
---

<LocalessDocument document={content} />
```

To render a nested block directly (e.g. inside a custom component), use `LocalessComponent`:

```astro
---
import { LocalessComponent } from '@localess/astro';
---

{data.body.map(item => <LocalessComponent data={item} links={content.links} references={content.references} />)}
```

## Component registry

Components auto-register from `<componentsDir>/**/*.astro` (default `componentsDir: 'src'`, so `src/**/*.astro`). Merge in an explicit map via the `components` option:

```js
localess({
  // ...
  components: { 'hero-section': HeroSection },
});
```

Both the registry key and `_schema` are compared through `toCamelCase()` — a file named `HeroSection.astro` matches `_schema: 'hero-section'` automatically.

## Writing components

Type a registered component's `Props` with `LocalessComponentProps<T>` — the same generic shape `@localess/react`'s `LocalessComponentProps<T>` uses, so `data`/`links`/`references`/`assets` stay typed against your own content type:

```astro
---
import { localessEditable, localessEditableField } from '@localess/astro';
import type { LocalessComponentProps } from '@localess/astro';
import type { HeroSection } from './.localess/localess'; // your generated content type

export type Props = LocalessComponentProps<HeroSection>;

const { data } = Astro.props;
---

<section {...localessEditable(data)}>
  <h1 {...localessEditableField('title')}>{data.title}</h1>
</section>
```

## Fallback component

```js
localess({
  // ...
  enableFallbackComponent: true,
  customFallbackComponent: 'localess/CustomFallback', // optional; omit to use the built-in FallbackComponent.astro
});
```

## Visual Editor sync

Two tiers, mutually exclusive:

- `enableSync: true` — debounced (~500ms) full reload on any edit event. Works under both SSR and static output.
- `livePreview: true` — SSR-only (`output: 'server'`; the integration throws otherwise). `save`/`publish`/`unpublish` reload; `input`/`change` debounce, POST the updated content to the current page, and `morphdom`-patch the response into the live DOM. No extra configuration needed — the live-preview middleware validates incoming preview requests against the same `spaceId` passed to `localess()`.

## Rich text

```astro
---
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
---

<LocalessRichText content={data.body} />
```

Same fixed TipTap extension set as `@localess/react`'s `renderRichTextToReact` (Document, Text, Paragraph, Heading 1–6, Bold, Italic, Strike, Underline, History, ListItem, OrderedList, BulletList, Code, CodeBlockLowlight, Link) — no per-node customization.

## Assets

```astro
---
import { resolveAsset } from '@localess/astro';
---

<img src={resolveAsset(data.heroImage, { w: 800 })} alt={data.heroImage.alt} />
```

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
    return Astro.rewrite('/404');
  }
  throw error;
}
---
```

## Import paths — subpath exports required for `.astro` files

`LocalessComponent`, `LocalessDocument`, `LocalessRichText`, `FallbackComponent` are `.astro` files and **cannot** be imported from `@localess/astro`'s default entry point. Import them from their dedicated subpaths:

```typescript
import LocalessComponent from '@localess/astro/LocalessComponent.astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
```

Everything else (`localess`/`localessIntegration`, `getLocalessClient`, `getLivePayload`, `resolveAsset`, `handleLocalessMessage`, `toCamelCase`, `LocalessApiError`, model types, `isBrowser`, `isIframe`) imports from the default entry point (`@localess/astro`).
