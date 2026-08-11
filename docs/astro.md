# @localess/astro Reference

Astro integration layer for Localess. A full Astro Integration (`localess()` in `astro.config.mjs`), matching `@storyblok/astro`'s architecture — see [ADR 007](./decisions/007-astro-integration-architecture.md) for why and how it differs where Localess's constraints require it.

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

Same fixed TipTap extension set as `@localess/react`'s `renderRichTextToReact` (Document, Text, Paragraph, Heading 1–6, Bold, Italic, Strike, Underline, History, ListItem, OrderedList, BulletList, Code, CodeBlockLowlight, Link) — no per-node customization.

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

Everything else (`localess`/`localessIntegration`, `getLocalessClient`, `getLivePayload`, `resolveAsset`, `handleLocalessMessage`, `toCamelCase`, model types, `isBrowser`, `isIframe`) imports from the default entry point (`@localess/astro`).

## Testing your own components

Use Astro's `experimental_AstroContainer` (`astro/container`) — see `packages/astro/CONTRIBUTING.md`. Note: `LocalessComponent.astro`/`LocalessDocument.astro` themselves aren't unit-testable this way (they depend on `virtual:*` modules only resolvable inside a real Astro build) — verify changes to them manually against `playgrounds/astro`/`playgrounds/astro-static`.
