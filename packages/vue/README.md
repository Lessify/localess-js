<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/vue

The Vue 3 integration for [Localess](https://github.com/Lessify/localess): a component registry that maps content schemas to your own components, rich text rendering, and Visual Editor live sync.

Give it a `Content` response and it renders your components for you, recursively, with the attributes the Visual Editor needs to make each block clickable.

**Rendering-only.** `@localess/vue` does not fetch data. In CSR you call the client yourself through `useLocaless()`; for SSR you fetch in your own server route with a **secret** token. Using Nuxt? [`@localess/nuxt`](../nuxt) wires all of this up for you.

## Requirements

- Node.js >= 24.0.0
- Vue >= 3.4 (peer dependency)

## Installation

```bash
# npm
npm install @localess/vue vue

# yarn
yarn add @localess/vue vue

# pnpm
pnpm add @localess/vue vue
```

---

## Setup

Install the `Localess` plugin once, at your app root, and register the components that render your schemas:

```ts
// main.ts
import { createApp } from 'vue';
import { Localess } from '@localess/vue';
import App from './App.vue';
import Page from './components/localess/Page.vue';
import Button from './components/localess/Button.vue';

const app = createApp(App);

app.use(Localess, {
  origin: import.meta.env.VITE_LOCALESS_ORIGIN,
  spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
  token: import.meta.env.VITE_LOCALESS_TOKEN, // public token — safe for the browser bundle
  components: { Page, Button },
  enableSync: true, // only meaningful inside the Visual Editor iframe
});

app.mount('#app');
```

> **Security:** this plugin runs in the browser, so only ever pass a **public** (read-only) token here. A secret token must never reach the client bundle — for server-side fetching use `localessClient` (re-exported from `@localess/vue`) inside a server route.

The keys of `components` are your schema ids. `fallbackComponent` renders anything unregistered, instead of a blank space.

---

## Rendering content

`<LocalessDocument>` takes a whole `Content` response and handles live sync; `<LocalessComponent>` renders a single block. From the [Nuxt playground](../../playgrounds/nuxt):

```vue
<template>
  <LocalessDocument v-if="content" :document="content" />
</template>
```

A component for one schema receives its block as `data`, typed with `LocalessSchemaProps`:

```vue
<!-- components/localess/Page.vue -->
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

Nested blocks go back through `<LocalessComponent>`, which looks each one up in the registry by its `_schema` — so `Page` never needs to know what a `Button` is.

---

## Making content editable

`localessEditable(data)` marks a block and `localessEditableField<T>('name')` marks a field. Both return plain attribute objects, so they go on with `v-bind`:

```vue
<button v-bind="localessEditable(data)" type="button">
  <span v-bind="localessEditableField<Button>('label')">{{ data.label }}</span>
</button>
```

`localessEditableField<T>` is typed against your content type, so a misspelled field name fails to compile rather than producing an attribute the editor quietly ignores.

---

## Fetching content

In a CSR app, `useLocaless()` gives you the configured client:

```ts
import { useLocaless } from '@localess/vue';

const content = await useLocaless().getContentBySlug<Page>('home', { locale: 'en' });
```

For SSR, fetch on the server with a secret token and pass the result down. `localessClient` is re-exported here so you never import `@localess/client` directly:

```ts
import { localessClient } from '@localess/vue';

const client = localessClient({ origin, spaceId, token: process.env.LOCALESS_TOKEN });
const content = await client.getContentBySlug('home');
```

---

## Rich text

`<LocalessRichText :content="…" />` renders the Studio editor's JSON. `useLocalessRichText` and `renderRichText` / `renderRichTextToHtml` are available when you need the value rather than a component. It's built on [`@localess/richtext`](../richtext) — **no TipTap at runtime**.

---

## Auto-registering components with Vite

Rather than listing every component by hand, the Vite plugin registers each `.vue` file under a directory, keyed by filename:

```ts
// vite.config.ts
import { localess } from '@localess/vue/vite';

export default defineConfig({
  plugins: [vue(), localess({ componentsDir: 'src/components/localess' })],
});
```

`components` overrides individual schema keys, and `componentNaming` controls how filenames map to keys.

---

## Visual Editor sync

`useLocalessSync()` exposes the live-editing state when you need to react to editor events yourself. With `enableSync: true` and the page running inside the Visual Editor iframe, `<LocalessDocument>` already re-renders on every keystroke — most apps need nothing further.

---

## Related

- [`@localess/nuxt`](../nuxt) — the Nuxt module wrapping this package
- [`@localess/client`](../client) — the underlying server-side SDK
- [`@localess/richtext`](../richtext) — the rich text model and renderer
- [docs/vue.md](../../docs/vue.md) — full reference
- [Nuxt playground](../../playgrounds/nuxt) — the source of the examples above

## License

See the [Localess](https://github.com/Lessify/localess) repository.
