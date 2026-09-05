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

Registration always goes through the `components: { schemaKey: Component }` option of `app.use(Localess, {...})`. Two ways to build that map:

1. **Manual** — import your components and pass the map yourself.
2. **Vite plugin** — `@localess/vue/vite`'s `localess({ componentsDir, components })` auto-globs a folder's `.vue` files into `virtual:localess-vue-components`, keyed by **filename verbatim** (`Page.vue` -> `Page`). Matching that key to `data._schema` is the `componentNaming` option's job at lookup time (see *Component naming strategies* below), not this plugin's. Its `components` option adds explicit path overrides (relative to `componentsDir`, `#ExportName` suffix for a named export); those win over globbed entries on key collision.

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

Built on `@localess/richtext` (see [docs/richtext.md](richtext.md)) — no TipTap at runtime. The `<LocalessRichText>` component renders native VNodes:

```vue
<script setup lang="ts">
import { LocalessRichText, type LocalessSchemaProps } from '@localess/vue';
import type { Article } from './models/localess'; // your content types — `body` is a `ContentRichText` field

const props = defineProps<LocalessSchemaProps<Article>>();
</script>

<template>
  <LocalessRichText :content="props.data.body" />
</template>
```

The `content` prop accepts a `ContentRichText` field value, a rich text document/node/node array, or `null`/`undefined`. Composables: `useLocalessRichText(doc, options?)` returns a reactive `ComputedRef<VNodeChild>`; `useLocalessRichTextHtml(doc, options?)` returns `ComputedRef<string>` for `v-html` bindings. Per-node overrides are Vue components receiving children as the default slot (declare the props you consume, or set `inheritAttrs: false`, to avoid attribute fallthrough):

```vue
<LocalessRichText :content="data.body" :renderers="{ link: AppLink }" />
```

## SSR with Nuxt

`@localess/vue` is rendering-only — SSR data-fetching goes through Nuxt's own server conventions, calling `localessClient` (re-exported from `@localess/vue`, never `@localess/client` directly) with a **secret** token in a server-only file:

```typescript
// server/api/content.ts
import { localessClient } from '@localess/vue';

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

Nuxt's own payload transfer hydrates the server-fetched result to the client — `@localess/vue` needs no hydration mechanism of its own. Register the `Localess` plugin in a Nuxt plugin (e.g. `app/plugins/localess.ts`, via `nuxtApp.vueApp.use(Localess, {...})`) with a **public** token only if you also want Visual Editor sync on top — `LocalessDocument` picks up live `input`/`change` events automatically; use `LocalessComponent` instead if you don't need sync.

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
| `LocalessRichText` | Component | Renders a rich text field to native VNodes (`content`, `renderers?` props) |
| `useLocalessRichText(doc, options?)` | Composable | Tiptap JSON → VNodes, returns a reactive `ComputedRef<VNodeChild>` |
| `useLocalessRichTextHtml(doc, options?)` | Composable | Tiptap JSON → HTML string for `v-html`, returns `ComputedRef<string>` |
| `renderRichText(content, options?)` | Function | One-shot Tiptap JSON → VNodes |
| `renderRichTextToHtml(content, options?)` | Function | One-shot Tiptap JSON → HTML string, re-exported from `@localess/richtext` |
| `LocalessApiError` | Class | Re-exported from `@localess/client` |
| `localessClient(options)` | Function | Re-exported from `@localess/client` — raw client factory for server-only SSR use, outside the `Localess` plugin's singleton lifecycle |
| `LocalessComponentProps`, `LocalessDocumentProps`, `LocalessSchemaProps`, `LocalessVueRichTextOptions`, `LocalessVueRichTextRenderers` | Types | Local prop/option types |
| `LocalessClient`, `LocalessClientOptions`, `EventToAppOf`, `EventToAppType` | Types | Re-exported from `@localess/client` |
| `Content`, `ContentData`, `ContentDataSchema`, `Assets`, `Links`, `References` | Types | Re-exported from `@localess/model` |
| `@localess/vue/vite`'s `localess(options)` | Vite plugin factory | Component auto-registration |
| `@localess/vue/vite`'s `VIRTUAL_LOCALESS_VUE_COMPONENTS_MODULE_ID` | Constant | `'virtual:localess-vue-components'` |

See `packages/vue/SKILL.md` for the full usage guide (also shipped inside the npm package).

## Component naming strategies

A Localess schema can be named anything; every framework has its own file-naming convention. The
`componentNaming` option reconciles them by normalizing **both** the registry key and the incoming
`data._schema` before they are compared.

| Strategy | `HeroBanner` / `hero-banner` / `hero_banner` -> |
|---|---|
| `exact` *(default)* | unchanged — matches only an identical spelling |
| `camelCase` | `heroBanner` |
| `PascalCase` | `HeroBanner` |
| `kebab-case` | `hero-banner` |
| `snake_case` | `hero_banner` |
| `lowercase` | `herobanner` — separators dropped entirely |

Every strategy except `exact` is case- and separator-insensitive, so they differ only in the shape of
the key they produce, not in what they match.

Name your component files after your schemas and the default `exact` works with no configuration.
Reach for another strategy when the two conventions genuinely differ — e.g. schemas named
`hero-banner` and files named `HeroBanner`.

Under any strategy other than `exact`, two files that normalize to the same key (`HeroBanner` and
`hero-banner` in one directory) collide; the SDK logs a warning naming both and keeps the first.

See [ADR 012](decisions/012-component-naming-strategies.md).

### Where to set it

`componentNaming` is an option of the **Vite plugin only** — `localess({ componentsDir, componentNaming })`
— because auto-discovery is the only thing that has to reconcile two naming conventions:

```ts
// vite.config.ts
import { localess } from '@localess/vue/vite';

localess({ componentsDir: 'src/components/localess', componentNaming: 'camelCase' })
```

It is **not** an option on the `Localess` plugin / `localessInit()`. When you pass a `components` map
by hand you choose the keys, so use the schema name as the key and matching is a plain exact lookup.

The plugin needs nothing from the core API to do this: when a non-`exact` strategy is configured, the
generated `virtual:localess-vue-components` registry resolves keys through the strategy itself, and
you pass it to `app.use(Localess, { components: localessComponents })` exactly as before. Under the
default `exact` it emits an ordinary object with no wrapper.

Strategy names only — there is no custom-function form.
