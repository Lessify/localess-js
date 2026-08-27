# `@localess/vue`

Vue 3 integration for Localess. Rendering-only: component registry, editable attributes, Visual Editor sync, rich-text rendering, and a Vite plugin for component auto-registration. Does not fetch data — see "SSR with Nuxt" for how server-side fetching fits in.

**Peer dependency:** Vue `>=3.4`.

## Installation

```bash
npm install @localess/vue vue
```

## CSR Quick Start

```typescript
// main.ts
import { createApp } from 'vue';
import { Localess } from '@localess/vue';
import App from './App.vue';

const app = createApp(App);
app.use(Localess, {
  origin: import.meta.env.VITE_LOCALESS_ORIGIN,
  spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
  token: import.meta.env.VITE_LOCALESS_TOKEN, // public token only
  components: { page: PageComponent, button: ButtonComponent },
  enableSync: true,
});
app.mount('#app');
```

```vue
<script setup lang="ts">
import { LocalessComponent, useLocaless } from '@localess/vue';

const client = useLocaless();
const content = await client.getContentBySlug('home');
</script>

<template>
  <LocalessComponent :data="content.data" />
</template>
```

## Component Registry

Two ways to register components, usable together (manual entries win on key collision):

1. **Manual** — pass `components: { schemaKey: Component }` to `app.use(Localess, {...})`.
2. **Vite plugin** — `@localess/vue/vite`'s `localess({ componentsDir, components })` auto-globs a folder's `.vue` files into `virtual:localess-vue-components`, keyed by kebab-cased filename.

```typescript
// vite.config.ts
import { localess } from '@localess/vue/vite';

export default defineConfig({
  plugins: [localess({ componentsDir: 'src/components/localess' })],
});
```

```typescript
// main.ts
// @ts-expect-error -- generated at build time
import { localessComponents } from 'virtual:localess-vue-components';

app.use(Localess, { origin, spaceId, token, components: localessComponents });
```

## Editable Attributes

```vue
<LocalessComponent :data="blok" />                          <!-- applies data-ll-id/data-ll-schema automatically -->
<section v-bind="localessEditable(blok)">...</section>       <!-- manual application -->
<h1 v-bind="localessEditableField('title')">{{ blok.title }}</h1> <!-- field-level -->
```

## Visual Editor Sync

`enableSync: true` (in `app.use(Localess, {...})`) injects the sync script and activates `useLocalessSync`. It's a no-op outside the Localess Visual Editor iframe.

```vue
<script setup lang="ts">
import { useLocalessSync } from '@localess/vue';

const latest = useLocalessSync(['input', 'change']);
</script>
```

## Rich Text Rendering

```vue
<script setup lang="ts">
import { useLocalessRichText } from '@localess/vue';

const props = defineProps<{ data: { body?: unknown } }>();
const html = useLocalessRichText(() => props.data.body);
</script>

<template>
  <div v-html="html" />
</template>
```

## SSR with Nuxt

`@localess/vue` is rendering-only — SSR data-fetching goes through Nuxt's own server conventions, calling `@localess/client` directly with a **secret** token in a server-only file:

```typescript
// server/api/content.ts
import { localessClient } from '@localess/client';

export default defineEventHandler(async event => {
  const client = localessClient({
    origin: useRuntimeConfig(event).localessOrigin,
    spaceId: useRuntimeConfig(event).localessSpaceId,
    token: useRuntimeConfig(event).localessToken, // secret, server-only
  });
  return client.getContentBySlug(getQuery(event).slug as string);
});
```

```vue
<!-- pages/[...slug].vue -->
<script setup lang="ts">
import { LocalessDocument } from '@localess/vue';

const { data: content } = await useAsyncData('content', () => $fetch('/api/content', { query: { slug: 'home' } }));
</script>

<template>
  <LocalessDocument v-if="content" :document="content" />
</template>
```

Nuxt's own payload transfer hydrates the server-fetched result to the client — `@localess/vue` needs no hydration mechanism of its own. Register the `Localess` plugin client-side (in a `.client.ts` Nuxt plugin) with a **public** token only if you also want Visual Editor sync on top — `LocalessDocument` picks up live `input`/`change` events automatically; use `LocalessComponent` instead if you don't need sync.

## API Reference

| Export | Kind | Description |
|---|---|---|
| `Localess` | Vue plugin | `app.use(Localess, options)` — installs the client + component registry |
| `LOCALESS_INJECTION_KEY` | `InjectionKey` | provide/inject key, for advanced use |
| `LocalessComponent` | Component | Dynamic schema-to-component renderer |
| `LocalessDocument` | Component | Wraps `LocalessComponent` and re-renders on Visual Editor sync events |
| `localessEditable(data)` | Function | Applies `data-ll-id`/`data-ll-schema`, bound onto an element |
| `localessEditableField(name)` | Function | Applies `data-ll-field`, bound onto an element |
| `useLocaless()` | Composable | Returns the injected `LocalessClient` |
| `useLocalessSync(event)` | Composable | Visual Editor bridge event subscription, returns a `Ref` |
| `useLocalessRichText(doc)` | Composable | Tiptap JSON → HTML, returns a `ComputedRef<string>` |
| `LocalessApiError` | Class | Re-exported from `@localess/client` |
| `@localess/vue/vite`'s `localess(options)` | Vite plugin factory | Component auto-registration |

See `packages/vue/SKILL.md` for the full usage guide (also shipped inside the npm package).
