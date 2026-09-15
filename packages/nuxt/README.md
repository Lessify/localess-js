<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/nuxt

The Nuxt module for [Localess](https://github.com/Lessify/localess). Add one entry to `modules`, configure your space, and you get auto-registered schema components, a server-side client that keeps your secret token on the server, and Visual Editor live sync.

It wraps [`@localess/vue`](../vue) — Nuxt is Vue, so the components, composables and helpers are that package's, and you import them from `@localess/vue`. This module is the wiring. See [ADR 011](../../docs/decisions/011-nuxt-module-depends-on-vue.md).

## Requirements

- Node.js >= 24.0.0
- Nuxt 4

## Installation

```bash
# npm
npm install @localess/nuxt @localess/vue

# yarn
yarn add @localess/nuxt @localess/vue

# pnpm
pnpm add @localess/nuxt @localess/vue
```

---

## Setup

From the [Nuxt playground](../../playgrounds/nuxt):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  modules: ['@localess/nuxt'],
  localess: {
    origin: 'https://demo.localess.org',
    spaceId: 'MmaT4DL0kJ6nXIILUcQF',

    // Public token — reaches the client bundle. Only ever put a token marked public in Localess here.
    token: process.env.LOCALESS_PUBLIC_TOKEN,

    // Secret token — stays on the server, read only by useLocalessServerClient().
    serverToken: process.env.LOCALESS_TOKEN,

    // Components under this directory are registered automatically — no manual registry.
    componentsDir: '~/components/localess',

    enableSync: true,
    debug: true,
  },
});
```

| Option | Default | Purpose |
|---|---|---|
| `origin` | — | Your Localess instance URL |
| `spaceId` | — | The space to read from |
| `token` | — | **Public** token, exposed to the browser |
| `serverToken` | — | **Secret** token, server-only |
| `componentsDir` | `'~/components/localess'` | Directory scanned for schema components |
| `enableSync` | `false` | Visual Editor live sync |

---

## The two-token split

This is the part worth understanding, because it's what keeps a secret token out of your client bundle.

- **`token`** is public and **reaches the browser**. It's read-only and limited to published content and translations. `useLocaless()` uses it for client-side fetching.
- **`serverToken`** is secret and **never leaves the server**. Only `useLocalessServerClient()` can read it.

At least one is required. Set only `serverToken` and client-side fetching is disabled — the module warns at build time, and `useLocaless()` throws in the browser, so the failure is loud rather than a token quietly leaking.

> Never put a secret token in `token`. Everything in `token` ends up in the client bundle by design.

---

## Fetching on the server

`useLocalessServerClient()` is available in any server route, from the auto-imported `#localess/server`:

```ts
// server/api/content.ts
import { LocalessApiError } from '@localess/vue';
import { useLocalessServerClient } from '#localess/server';

export default defineEventHandler(async event => {
  const client = useLocalessServerClient();
  const slug = (getQuery(event).slug as string) || 'home';

  try {
    return await client.getContentBySlug(slug, { locale: 'en' });
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) {
      throw createError({ statusCode: 404, statusMessage: `Content not found for slug "${slug}".` });
    }
    throw error;
  }
});
```

Then fetch it from a page with `useAsyncData`:

```vue
<!-- app/pages/[...slug].vue -->
<script setup lang="ts">
import { LocalessDocument, type Content } from '@localess/vue';
import type { Page } from '#shared/models/localess';

const route = useRoute();
const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug || '';

const { data: content, error } = await useAsyncData(`content-${slug}`, () =>
  $fetch<Content<Page>>('/api/content', { query: { slug } })
);

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true });
}
</script>

<template>
  <LocalessDocument v-if="content" :document="content" />
</template>
```

---

## Schema components

Every `.vue` file under `componentsDir` is registered automatically, keyed by filename — there is no registry to keep in sync. A component receives its block as `data`:

```vue
<!-- app/components/localess/Page.vue -->
<script setup lang="ts">
import { LocalessComponent, LocalessRichText, type LocalessSchemaProps, localessEditable, localessEditableField } from '@localess/vue';
import type { Page } from '#shared/models/localess';

const props = defineProps<LocalessSchemaProps<Page>>();
</script>

<template>
  <main v-bind="localessEditable(props.data)" class="flex flex-col gap-4">
    <h1 v-bind="localessEditableField<Page>('title')">{{ props.data.title }}</h1>

    <div v-if="props.data.buttons?.length" class="flex gap-2">
      <LocalessComponent v-for="button in props.data.buttons" :key="button._id" :data="button" />
    </div>

    <div v-if="props.data.content" v-bind="localessEditableField<Page>('content')" class="prose">
      <LocalessRichText :content="props.data.content" />
    </div>
  </main>
</template>
```

Note the imports come from `@localess/vue`, not from this package. Nested blocks go back through `<LocalessComponent>`, which resolves each one by its `_schema`.

---

## Visual Editor sync

With `enableSync: true` and the page running inside the Visual Editor iframe, `<LocalessDocument>` re-renders on every keystroke. `localessEditable` / `localessEditableField` supply the attributes that let an author click a block in the preview and land on the right field.

---

## Related

- [`@localess/vue`](../vue) — the components, composables and helpers this module registers
- [`@localess/client`](../client) — the underlying server-side SDK
- [docs/nuxt.md](../../docs/nuxt.md) — full reference
- [Nuxt playground](../../playgrounds/nuxt) — the source of the examples above

## License

See the [Localess](https://github.com/Lessify/localess) repository.
