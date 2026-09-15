<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/astro

The Astro integration for [Localess](https://github.com/Lessify/localess): one entry in `integrations`, and your `.astro` components become the renderers for your content schemas — with Visual Editor live preview on top.

## Requirements

- Node.js >= 24.0.0
- Astro ^6.0.0 || ^7.0.0 (peer dependency)

## Installation

```bash
# npm
npm install @localess/astro

# yarn
yarn add @localess/astro

# pnpm
pnpm add @localess/astro
```

---

## Setup

Add the integration to `astro.config.mjs`. From the [Astro playground](../../playgrounds/astro):

```js
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { localess } from '@localess/astro';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    localess({
      origin: 'https://demo.localess.org',
      spaceId: 'MmaT4DL0kJ6nXIILUcQF',
      token: 'Y4rvboPnyzVeC7LddEK5',
      componentsDir: 'src/components/localess',
      enableFallbackComponent: true,
      livePreview: true,
      debug: true,
    }),
  ],
});
```

Every `.astro` file under `componentsDir` is registered automatically, keyed by filename — no manual registry to keep in sync. `componentNaming` controls how filenames map to schema ids, and `components` overrides individual keys.

> **Security:** treat the `token` here as **secret**. `@localess/astro` has not been reworked for Localess public tokens yet, so keep it server-side — which `output: 'server'` gives you. See [ADR 001](../../docs/decisions/001-server-side-only.md).

| Option | Default | Purpose |
|---|---|---|
| `componentsDir` | `'src'` | Directory scanned for schema components |
| `componentNaming` | `'exact'` | How filenames map to schema ids |
| `enableFallbackComponent` | `false` | Render a placeholder for unregistered schemas instead of nothing |
| `customFallbackComponent` | — | Your own placeholder component |
| `enableSync` | `false` | Visual Editor live sync |
| `livePreview` | `false` | Draft payload delivery via `getLivePayload` |

---

## Fetching and rendering a page

```astro
---
// src/pages/[...path]/index.astro
import { getLocalessClient, LocalessApiError } from '@localess/astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';
import Layout from '../../layouts/Layout.astro';

let document;
try {
  document = await getLocalessClient().getContentBySlug('home', { locale: 'en' });
} catch (error) {
  if (error instanceof LocalessApiError && error.status === 404) {
    Astro.response.status = 404;
    return Astro.rewrite('/404');
  }
  throw error;
}
---

<Layout>
  <LocalessDocument document={document} />
</Layout>
```

`getLocalessClient()` returns the client the integration configured — there's no second initialization step. `LocalessApiError.status` is how you tell a missing slug from a real failure.

Note that components are imported from their own paths (`@localess/astro/LocalessDocument.astro`), while functions and types come from the package root.

---

## A schema component

Each component receives its block as `data`, plus the resolved `links`, `references` and `assets` maps:

```astro
---
// src/components/localess/Page.astro
import { localessEditable, localessEditableField } from '@localess/astro';
import type { LocalessSchemaProps } from '@localess/astro';
import LocalessComponent from '@localess/astro/LocalessComponent.astro';
import LocalessRichText from '@localess/astro/LocalessRichText.astro';
import type { Page } from '@/shared/models/localess';

export type Props = LocalessSchemaProps<Page>;

const { data, links, references, assets } = Astro.props;
---

<main {...localessEditable(data)} class="flex flex-col gap-4">
  <h1 {...localessEditableField('title')}>{data.title}</h1>

  <div class="flex gap-2">
    {data.buttons?.map(button => (
      <LocalessComponent data={button} links={links} references={references} assets={assets} />
    ))}
  </div>

  {data.content && (
    <div {...localessEditableField('content')} class="prose">
      <LocalessRichText content={data.content} />
    </div>
  )}
</main>
```

Nested blocks go back through `<LocalessComponent>`, which looks each one up by its `_schema` — so `Page` never needs to know what a `Button` is. Pass `links`, `references` and `assets` down so resolved values stay available at any depth.

---

## Live preview

With `livePreview: true`, `getLivePayload(Astro)` returns the draft the author is currently editing, so you can render that instead of the published content:

```astro
---
import { getLivePayload, getLocalessClient, type Content } from '@localess/astro';

const preview = await getLivePayload(Astro);

let document: Content;
if (preview.data) {
  document = { /* …envelope around preview.data… */ } as Content;
} else {
  document = await getLocalessClient().getContentBySlug(slug, { locale });
}
---
```

---

## Assets

```ts
import { resolveAsset, resolveAssetDownload, resolveAssetOriginal } from '@localess/astro';

resolveAsset(data.heroImage, { w: 800, f: 'webp' }); // a transformed rendition
resolveAssetOriginal(data.heroImage);                // the uploaded bytes, inline
resolveAssetDownload(data.brochure);                 // the uploaded bytes, as an attachment
```

`resolveAsset` always returns a rendition — a still raster is re-encoded even with no parameters. `resolveAssetOriginal` is the only way to get the original file back.

---

## Import boundary

`@localess/astro` ships a guard test that fails the build if a new file imports `@localess/client` directly, or imports a model type through the client's re-export rather than from `@localess/model`. If you're contributing, see [CONTRIBUTING.md](./CONTRIBUTING.md) for the sanctioned files.

---

## Related

- [`@localess/client`](../client) — the underlying server-side SDK
- [`@localess/richtext`](../richtext) — the rich text model and renderer
- [docs/astro.md](../../docs/astro.md) — full reference
- [Astro playground](../../playgrounds/astro) — the source of the examples above

## License

See the [Localess](https://github.com/Lessify/localess) repository.
