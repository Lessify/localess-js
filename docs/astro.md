# @localess/astro Reference

Astro integration layer for Localess. A full Astro Integration (`localess()` in `astro.config.mjs`), matching `@storyblok/astro`'s architecture — see [ADR 006](./decisions/006-astro-integration-architecture.md) for why and how it differs where Localess's constraints require it.

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

## Component registry

Components auto-register from `<componentsDir>/localess/**/*.astro` (default `componentsDir: 'src'`, so `src/localess/**/*.astro`). Merge in an explicit map via the `components` option:

```js
localess({
  // ...
  components: { 'hero-section': HeroSection },
});
```

Both the registry key and `_schema` are compared through `toCamelCase()` — a file named `HeroSection.astro` matches `_schema: 'hero-section'` automatically.

## Writing components

Type a registered component's `Props` with `LocalessSchemaProps<T>` — the same generic shape `@localess/react`'s `LocalessSchemaProps<T>` uses (`LocalessComponentProps` is the built-in renderer's own props type):

```astro
---
import { localessEditable, localessEditableField } from '@localess/astro';
import type { LocalessSchemaProps } from '@localess/astro';
import type { HeroSection } from './.localess/localess'; // your generated content type

export type Props = LocalessSchemaProps<HeroSection>;

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
- `livePreview: true` — SSR-only (`output: 'server'`; the integration throws otherwise). `save`/`publish`/`unpublish` reload; `input`/`change` debounce, POST the updated content to the current page, and `morphdom`-patch the response into the live DOM. No extra configuration needed — `live-preview/middleware.ts` validates incoming preview requests against the same `spaceId` passed to `localess()`.

## Rich text

```astro
---
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
---

<LocalessRichText content={data.body} />
```

Built on `@localess/richtext` (see [docs/richtext.md](richtext.md)) — no TipTap at runtime. Supported elements: headings 1–6, paragraphs, bold/italic/strike/underline/code, ordered/unordered lists, code blocks, links. Per-node customization via the string-based `renderers` prop:

```astro
<LocalessRichText content={data.body} renderers={{ paragraph: ({ children }) => `<p class="prose">${children}</p>` }} />
```

`renderLocalessRichTextToHtml(content, options?)` (alias of `renderRichTextToHtml`) remains available from `@localess/astro` for standalone rendering.

## Assets

```astro
---
import { resolveAsset } from '@localess/astro';
---

<img src={resolveAsset(data.heroImage, { w: 800 })} alt={data.heroImage.alt} />
```

## Import paths — subpath exports required for `.astro` files

`LocalessComponent`, `LocalessDocument`, `LocalessRichText`, `FallbackComponent` are `.astro` files and **cannot** be imported from `@localess/astro`'s default entry point. Import them from their dedicated subpaths:

```typescript
import LocalessComponent from '@localess/astro/LocalessComponent.astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
```

Everything else (`localess`/`localessIntegration`, `getLocalessClient`, `getLivePayload`, `resolveAsset`, `handleLocalessMessage`, `toCamelCase`, `LocalessApiError`, model types, `isBrowser`, `isIframe`) imports from the default entry point (`@localess/astro`).

## Error handling

`getContentBySlug`/`getContentById` throw `LocalessApiError` on a non-2xx API response — check `error.status === 404` to distinguish a missing slug from other failures (network errors, 5xx) and render your own not-found page:

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

## Testing your own components

Use Astro's `experimental_AstroContainer` (`astro/container`) — see `packages/astro/CONTRIBUTING.md`. Note: `LocalessComponent.astro`/`LocalessDocument.astro` themselves aren't unit-testable this way (they depend on `virtual:*` modules only resolvable inside a real Astro build) — verify changes to them manually against `playgrounds/astro`/`playgrounds/astro-static`.
