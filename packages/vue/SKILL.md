# SKILL: @localess/vue

## Overview

`@localess/vue` is the **Vue 3 integration layer** for Localess. It builds on `@localess/client` and adds:

- A **component registry** mapping Localess schema keys to Vue components, installed via the `Localess` plugin
- `<LocalessComponent>` — dynamic content renderer
- `<LocalessDocument>` — wraps `<LocalessComponent>` with automatic Visual Editor live sync
- `localessEditable()` — block-level editable attributes (`data-ll-id`/`data-ll-schema`), bound onto an element
- `localessEditableField()` — field-level editable attribute, bound onto an element
- **Visual Editor sync** support via `useLocalessSync`
- **Rich text** rendering from Tiptap JSON via `<LocalessRichText>` / `useLocalessRichText` (built on `@localess/richtext`, no TipTap at runtime)
- `@localess/vue/vite` — Vite plugin for component auto-registration

**Peer dependency:** Vue `>=3.4`.

**Rendering-only package.** `@localess/vue` does not fetch data for you. For CSR, call `useLocaless().getContentBySlug(...)` yourself (or any client method). For SSR (e.g. Nuxt), fetch with `localessClient` (re-exported from `@localess/vue`, never `@localess/client` directly) in your own server route/`useAsyncData`, using a **secret** token — never in a file that reaches the browser bundle. See "SSR with Nuxt" below.

---

## Installation

```bash
npm install @localess/vue vue
```

---

## CSR Setup

Install the `Localess` plugin once, at your app's root, with a **public** (read-only) token:

```typescript
// main.ts
import { createApp } from 'vue';
import { Localess } from '@localess/vue';
import App from './App.vue';

const app = createApp(App);
app.use(Localess, {
  origin: import.meta.env.VITE_LOCALESS_ORIGIN,
  spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
  token: import.meta.env.VITE_LOCALESS_TOKEN, // public token — safe for the browser bundle
  components: {
    page: PageComponent,
    button: ButtonComponent,
  },
  enableSync: true, // only meaningful inside the Localess Visual Editor iframe
});
app.mount('#app');
```

> **Security:** only ever pass a **public** (read-only) token here — this plugin runs in the browser. Never pass a secret token to `Localess`.

Plugin options are `LocalessClientOptions` plus `components` (schema key → component), `fallbackComponent` (rendered when a schema key is unregistered), and `enableSync`.

---

## `<LocalessComponent>`

Dynamically renders a Localess content block by looking up its `_schema` in the component registry. Applies `localessEditable(data)`'s `data-ll-id`/`data-ll-schema` attributes (via `v-bind`) to the resolved registered component — not to `fallbackComponent`. Accepts `assets`, `links`, and `references` alongside `data` and forwards all four to the resolved component (or `fallbackComponent`) — registered components should declare the same four props (typed with `LocalessSchemaProps<T>`) and pass `assets`/`links`/`references` through when rendering nested `<LocalessComponent>`s. `LocalessComponentProps` is the renderer's own props type; use `LocalessSchemaProps` for your registered components.

```vue
<script setup lang="ts">
import { LocalessComponent, type LocalessSchemaProps } from '@localess/vue';
defineProps<LocalessSchemaProps>();
</script>

<template>
  <main>
    <h1>{{ data.title }}</h1>
    <LocalessComponent v-for="item in data.body" :key="item._id" :data="item" :assets="assets" :links="links" :references="references" />
  </main>
</template>
```

Falls back to `fallbackComponent` (if registered) when the schema key is unregistered, or renders an inline error message as a last resort.

---

## `<LocalessDocument>`

Wraps `<LocalessComponent>` and subscribes to Visual Editor `input`/`change` events automatically (when `enableSync` is active), re-rendering with the updated content in place. Also re-syncs when the `document` prop itself changes — important for SSR frameworks like Nuxt, where client-side navigation to a new slug reuses the same component instance rather than remounting it.

```vue
<script setup lang="ts">
import { LocalessDocument, type LocalessDocumentProps } from '@localess/vue';
defineProps<LocalessDocumentProps>();
</script>

<template>
  <LocalessDocument :document="document" />
</template>
```

Renders an inline error message if `document.data` is missing. Prefer this over `<LocalessComponent>` for the top-level content of a page when Visual Editor sync should apply; use `<LocalessComponent>` directly for nested blocks within an already-synced tree.

---

## `localessEditable()`

Applies the same `data-ll-id`/`data-ll-schema` attributes directly to an element, for cases not going through `<LocalessComponent>`:

```vue
<script setup lang="ts">
import { type ContentDataSchema, localessEditable } from '@localess/vue';
defineProps<{ data: ContentDataSchema }>();
</script>

<template>
  <section v-bind="localessEditable(data)">
    ...
  </section>
</template>
```

---

## `localessEditableField()`

A plain function (not a directive — the field name is static, known at author time) returning `{ 'data-ll-field': fieldName }`. Bind it onto the element rendering a single field, so editors can click-to-edit that field directly instead of only the whole block:

```vue
<script setup lang="ts">
import { localessEditableField } from '@localess/vue';
defineProps<{ data: { title?: string } }>();
</script>

<template>
  <h1 v-bind="localessEditableField('title')">{{ data.title }}</h1>
</template>
```

Type-safe when given your content type as the generic: `localessEditableField<Page>('title')` only accepts keys of `Page` (excluding `_id`/`_schema`). Use alongside `localessEditable()` on the block root, not instead of it.

---

## Composables

### `useLocaless()`

Returns the injected `LocalessClient`. Throws if called outside a component tree with the `Localess` plugin installed.

```vue
<script setup lang="ts">
import { useLocaless } from '@localess/vue';

const client = useLocaless();
const content = await client.getContentBySlug('home');
</script>
```

### `useLocalessSync(event)`

Subscribes to Visual Editor bridge events (`input`, `change`, etc.) and returns a `Ref` updated with the latest matching event. No-ops when `enableSync` was not set (or outside the Visual Editor iframe).

```vue
<script setup lang="ts">
import { useLocalessSync } from '@localess/vue';

const latestChange = useLocalessSync(['input', 'change']);
</script>
```

### Rich text — `<LocalessRichText>`, `useLocalessRichText`, `useLocalessRichTextHtml`

Built on `@localess/richtext` — no TipTap at runtime. The component renders native VNodes. Its `content` prop accepts a `ContentRichText` field value (as typed in your generated content types), a rich text document/node/node array, or `null`/`undefined`:

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

- `useLocalessRichText(doc, options?)` → reactive `ComputedRef<VNodeChild>`. Accepts a plain value, a `Ref`, or a getter.
- `useLocalessRichTextHtml(doc, options?)` → `ComputedRef<string>` for `v-html` bindings.
- Per-node overrides: `renderers` (`LocalessVueRichTextRenderers`) maps type names to Vue components; children arrive as the default slot, and the node/mark's own fields (`type`, `attrs`, `text`, `marks`, ...) plus `context.renderers` arrive as props. Override components should declare the props they consume (or set `inheritAttrs: false`) to avoid attribute fallthrough. `useLocalessRichTextHtml`/`renderRichTextToHtml` instead take string-returning renderers (`({ children, attrs }) => string`).

---

## `@localess/vue/vite` — Component Auto-Registration

`localess(options)` returns a Vite plugin exposing `virtual:localess-vue-components`, a glob-based auto-registry of every `.vue` file under `componentsDir` (keyed by filename verbatim, e.g. `Page.vue` -> `Page`; how that key is matched to `data._schema` is the `componentNaming` option), merged with explicit `components` path overrides (paths are relative to `componentsDir`; suffix a path with `#ExportName` for a named export; a bare path assumes a default export — manual entries win on key collision).

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { localess } from '@localess/vue/vite';

export default defineConfig({
  plugins: [
    localess({
      componentsDir: 'src/components/localess', // default: 'src'
      components: { hero: 'HeroOverride.vue' },
    }),
  ],
});
```

```typescript
// main.ts
// @ts-expect-error -- virtual module generated by the plugin above
import { localessComponents } from 'virtual:localess-vue-components';

app.use(Localess, { origin, spaceId, token, components: localessComponents });
```

> This plugin only ever handles a **public**, client-graph-only registration flow — it does not do SSR data-fetching, and unlike `@localess/react/vite` it never sees or emits a secret token. For SSR, fetch with `localessClient` (re-exported from `@localess/vue`) server-side (see below).

---

## SSR with Nuxt

`@localess/vue` doesn't own data-fetching, so SSR looks like any other Nuxt data flow: fetch with `localessClient` in a server-only file (secret token), render the result with `@localess/vue`'s components (public token, only needed if client-side sync is also enabled). Always import `localessClient` from `@localess/vue` — never `@localess/client` directly.

```typescript
// server/api/content.ts — server-only, secret token never reaches the client bundle
import { localessClient } from '@localess/vue';

export default defineEventHandler(async event => {
  const client = localessClient({
    origin: useRuntimeConfig(event).localessOrigin,
    spaceId: useRuntimeConfig(event).localessSpaceId,
    token: useRuntimeConfig(event).localessToken, // secret
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

Nuxt's own payload transfer hydrates the server-fetched result to the client — no `@localess/vue`-specific hydration step is needed. Call `Localess`'s `app.use(...)` with a **public** token only if you also want Visual Editor sync on top — `LocalessDocument` picks up live `input`/`change` events automatically; use `LocalessComponent` instead if you don't need sync.

---

## Exports Reference

```typescript
// Plugin & context
export { Localess }                 // Vue plugin: app.use(Localess, options)
export { LOCALESS_INJECTION_KEY }   // provide/inject key, for advanced use

// Rendering
export { LocalessComponent }        // Dynamic schema-to-component renderer
export { LocalessDocument }         // Wraps LocalessComponent with automatic Visual Editor live sync
export { localessEditable }         // Block-level data-ll-id/data-ll-schema attributes
export { localessEditableField }    // Field-level data-ll-field attribute

// Composables
export { useLocaless }              // Returns the injected LocalessClient
export { useLocalessSync }          // Visual Editor bridge event subscription
export { useLocalessRichText }      // Tiptap JSON -> VNodes (reactive)
export { useLocalessRichTextHtml }  // Tiptap JSON -> HTML string (reactive, for v-html)

// Rich text
export { LocalessRichText }         // Rich text component (content, renderers?)
export { renderRichText }           // One-shot Tiptap JSON -> VNodes
export { renderRichTextToHtml }     // One-shot Tiptap JSON -> HTML string (re-exported from @localess/richtext)

// Error handling (re-exported from @localess/client)
export { LocalessApiError }

// Raw client factory (re-exported from @localess/client, for server-only SSR use — see "SSR with Nuxt")
export { localessClient }

// Types (re-exported from @localess/client)
export type { LocalessClient, LocalessClientOptions, EventToAppOf, EventToAppType }

// Types (local)
export type { LocalessComponentProps, LocalessDocumentProps, LocalessSchemaProps }
export type { LocalessVueRichTextOptions, LocalessVueRichTextRenderers } // { renderers?: Record<type, Component> }

// Types (re-exported from @localess/model)
export type { Content, ContentData, ContentDataSchema, Assets, Links, References }
```

```typescript
// @localess/vue/vite
export { localess }                              // Vite plugin factory
export { VIRTUAL_LOCALESS_VUE_COMPONENTS_MODULE_ID } // 'virtual:localess-vue-components'
```

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

Also accepts a custom `(name: string) => string`, applied to both sides.

A **Vite-plugin option only** — `localess({ componentsDir, componentNaming })` from `@localess/vue/vite`.
Not an option on the `Localess` plugin: a hand-written `components` map has keys you already control,
so matching there is a plain exact lookup. The generated registry resolves keys itself, so nothing is
added to `localessInit()`. Strategy names only.
