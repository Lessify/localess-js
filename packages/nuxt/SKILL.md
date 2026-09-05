---
name: localess-nuxt
description: Nuxt module for Localess — config-driven setup, component auto-registration, public/secret token split, and a server-only client.
---

# @localess/nuxt

Nuxt 4 module wrapping `@localess/vue`. Everything `@localess/vue` exposes still applies; this
package adds Nuxt wiring — `nuxt.config.ts` configuration, auto-imports, component
auto-registration, and a server-only client that can read draft content.

Install alongside its peer:

```bash
npm install @localess/nuxt
```

## Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@localess/nuxt'],
  localess: {
    origin: 'https://my.localess.app',
    spaceId: 'abc123',
    token: process.env.LOCALESS_PUBLIC_TOKEN,
    serverToken: process.env.LOCALESS_TOKEN,
    componentsDir: '~/components/localess',
    enableSync: true,
    debug: false,
  },
});
```

That is the whole setup. Do **not** also write a Nuxt plugin calling `@localess/vue`'s `Localess`
plugin — the module registers it.

## Options

All set under the `localess` key in `nuxt.config.ts`.

| Option | Type | Default | Notes |
|---|---|---|---|
| `origin` | `string` | — | Required. Localess instance origin. |
| `spaceId` | `string` | — | Required. |
| `token` | `string?` | — | **Public** token. Reaches the client bundle. |
| `serverToken` | `string?` | — | **Secret** token. Server-only, never bundled. |
| `componentsDir` | `string?` | `'~/components/localess'` | Scanned for `.vue` components. |
| `componentNaming` | strategy name | `'exact'` | How `_schema` is matched to a component key. |
| `components` | `Record<string, string>?` | `{}` | Explicit schema-key → path overrides, relative to `componentsDir`. Suffix `#ExportName` for a named export. Win over discovered entries. |
| `enableSync` | `boolean?` | `false` | Loads the Visual Editor sync script. |
| `debug` | `boolean?` | `false` | Logs client requests. |
| `cacheTTL` | `number \| false?` | — | Cache TTL in seconds for the server client only. |

At least one of `token` or `serverToken` is required; `origin` and `spaceId` always are. Setting
neither token, or omitting `origin`/`spaceId`, fails the build with a message naming the cause.

## The two tokens

This is the part to get right.

- **`token` is public.** It is written to `runtimeConfig.public.localess` and therefore ships to the
  browser and is visible in the network panel. Only put a token marked **public** in Localess here —
  those are read-only and see published content and translations only.
- **`serverToken` is secret.** It is written to `runtimeConfig.localess`, which Nuxt never exposes to
  the client, and is read only by `useLocalessServerClient()`. This is the only way to read draft or
  unpublished content in Nuxt.

There is deliberately no single `token` option that the module places by guessing the rendering
mode. If you configure only `serverToken`, client-side fetching is off and the module warns at build
time; `useLocaless()` will throw in the browser.

## Component auto-registration

Every `.vue` file under `componentsDir` is registered automatically. Each is keyed by its filename
verbatim:

```
components/localess/Page.vue        ->  'Page'
components/localess/HeroBanner.vue  ->  'HeroBanner'
```

Lookup is by `data._schema`, which Localess reports exactly as the schema was named — so under the
default `exact` strategy, naming the file after the schema is all that is needed.

### componentNaming

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

`@localess/nuxt` serializes options into `runtimeConfig`, so this accepts the strategy names only,
not a custom function.

Explicit overrides win:

```typescript
localess: {
  components: { Page: 'blocks/CustomPage.vue', Hero: 'blocks/Hero.vue#HeroBlock' },
}
```

## Auto-imported

No import statement needed anywhere in the app.

**Composables:** `useLocaless`, `useLocalessSync`, `useLocalessRichText`, `useLocalessRichTextHtml`,
`renderRichText`, `renderRichTextToHtml`, `localessEditable`, `localessEditableField`.

**Components:** `LocalessDocument`, `LocalessComponent`, `LocalessRichText`.

## Server client

```typescript
// server/api/content.ts
import { useLocalessServerClient } from '#localess/server';

export default defineEventHandler(async event => {
  const client = useLocalessServerClient();
  return await client.getContentBySlug('home', { locale: 'en' });
});
```

`useLocalessServerClient(): LocalessClient` — authenticated with `serverToken`. Memoised for the
server process lifetime, so its in-memory cache is shared across requests; safe because every caller
uses the same token and so has identical permissions.

Throws if `serverToken` is unset, or if called in the browser — both with messages naming the cause.
The `#localess/server` alias is registered in both the app and Nitro graphs.

## Rendering content

```vue
<script setup lang="ts">
const { data: content } = await useAsyncData('home', () => $fetch('/api/content'));
</script>

<template>
  <LocalessDocument v-if="content" :document="content" />
</template>
```

`LocalessDocument` dispatches on `_schema` to your registered components.

## Constraints

- Nuxt 4 only (`peerDependencies: nuxt ^4.0.0`).
- Depends on `@localess/vue` — the one sanctioned framework-to-framework dependency in this
  monorepo. See `docs/decisions/011-nuxt-module-depends-on-vue.md`.
- Built with `@nuxt/module-builder`, not Vite library mode.

## DevTools

A **Localess** tab in Nuxt DevTools showing the resolved config, which token kinds are set (presence
only — never values), and the component registry with the key each entry resolves as, plus any
naming collisions. Served from the dev-only route `/__localess`, re-read per request, never present
in a production build. Disable with `devtools: false`.
