# `@localess/nuxt`

Nuxt 4 module wrapping `@localess/vue`. It replaces the hand-written Nuxt plugin that Nuxt
consumers previously had to author themselves, and adds the two things that plugin could not do:
component auto-registration and a server-only client that can read draft content.

Everything in [docs/vue.md](vue.md) still applies — the components, composables, and rich text
renderer are `@localess/vue`'s. This document covers only the Nuxt layer.

## Install

```bash
npm install @localess/nuxt
```

Requires Nuxt `^4.0.0`.

## Configure

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

There is no plugin file to write. If you previously had `plugins/localess.ts` calling
`vueApp.use(Localess, ...)`, delete it — the module registers the plugin, and running both would
initialise the client twice.

## Options

| Option | Type | Default | Runtime |
|---|---|---|---|
| `origin` | `string` | — (required) | public |
| `spaceId` | `string` | — (required) | public |
| `token` | `string?` | — | **public** — reaches the browser |
| `serverToken` | `string?` | — | **private** — server only |
| `componentsDir` | `string?` | `'~/components/localess'` | build time |
| `componentNaming` | strategy name | `'exact'` | build time |
| `devtools` | `boolean?` | `true` | dev only |
| `components` | `Record<string, string>?` | `{}` | build time |
| `enableSync` | `boolean?` | `false` | public |
| `debug` | `boolean?` | `false` | public |
| `cacheTTL` | `number \| false?` | — | private |

Validation happens at build time, not at runtime: missing `origin` or `spaceId` fails the build, as
does configuring neither token.

## The token split

Nuxt hands one config object to two runtimes, which makes it the framework where leaking a secret
token is easiest. The module therefore takes **two differently-named tokens** rather than one token
plus a mode flag:

| | `token` | `serverToken` |
|---|---|---|
| Written to | `runtimeConfig.public.localess` | `runtimeConfig.localess` |
| Reaches the browser | **yes** | no |
| Read by | the Vue plugin, `useLocaless()` | `useLocalessServerClient()` |
| Can read drafts | no | yes |

Only put a token marked **public** in Localess into `token`. Public tokens are read-only and see
published content and translations only. The module cannot detect a secret token placed in `token` —
that is the one failure mode it cannot catch for you.

Configure only `serverToken` and the module warns at build time that client-side fetching is
disabled; `useLocaless()` then throws in the browser. That is a supported setup for apps that fetch
everything server-side.

Compare `@storyblok/nuxt`, which has a single `accessToken` and a boolean `enableServerClient` whose
default (`false`) writes that token into the client bundle. The two-name split exists specifically
to make that class of mistake unrepresentable. See
[ADR 011](decisions/011-nuxt-module-depends-on-vue.md).

## Components

Every `.vue` file under `componentsDir` is registered automatically, keyed by its filename verbatim
(`Page.vue` -> `Page`). `LocalessComponent` resolves by `data._schema`, which Localess reports
exactly as the schema was named — so name the file after the schema and it resolves with no
configuration.

If your filenames and schema names follow different conventions, set `componentNaming` (see below)
rather than renaming files.

Override explicitly when the filename cannot match the schema name:

```typescript
localess: {
  components: {
    Page: 'blocks/CustomPage.vue',
    Hero: 'blocks/Hero.vue#HeroBlock',
  },
}
```

Paths are relative to `componentsDir`; `#ExportName` selects a named export. Overrides win over
discovered components. In `nuxt dev` the registry regenerates when a `.vue` file is added or removed
under `componentsDir`.

## Auto-imports

Available without an import statement:

- **Composables** — `useLocaless`, `useLocalessSync`, `useLocalessRichText`,
  `useLocalessRichTextHtml`, `renderRichText`, `renderRichTextToHtml`, `localessEditable`,
  `localessEditableField`
- **Components** — `LocalessDocument`, `LocalessComponent`, `LocalessRichText`

## Fetching server-side

```typescript
// server/api/content.ts
import { useLocalessServerClient } from '#localess/server';
import { LocalessApiError } from '@localess/vue';

export default defineEventHandler(async event => {
  const client = useLocalessServerClient();
  try {
    return await client.getContentBySlug('home', { locale: 'en' });
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' });
    }
    throw error;
  }
});
```

```vue
<script setup lang="ts">
const { data: content } = await useAsyncData('home', () => $fetch('/api/content'));
</script>

<template>
  <LocalessDocument v-if="content" :document="content" />
</template>
```

The client is memoised for the server process lifetime, so its in-memory cache is shared across
requests. That is safe because every caller uses the same `serverToken` and therefore has identical
permissions — unlike a cache shared between *different* tokens, which
[ADR 003](decisions/003-ttl-cache-design.md) warns against.

Calling `useLocalessServerClient()` in client code throws with a message naming the cause rather
than silently returning an unauthenticated client.

## Visual Editor

`enableSync: true` loads the sync script, and edits in Localess Studio update the running app in
`nuxt dev`. It only has an effect inside the Studio iframe, so leaving it on in production is
harmless but pointless.

## DevTools

The module registers a **Localess** tab in Nuxt DevTools (`Shift + Alt + D`). It shows:

- the resolved origin and space, with a link into Localess Studio
- which token kinds are configured — **presence only, never the values**
- the active `componentNaming` strategy and `componentsDir`
- the component registry: every discovered file, the key it is registered under, and the key a
  `_schema` must resolve to in order to match it

That last table is the point. When a block silently renders nothing, the usual cause is a file name
that does not reconcile with the schema name — the *Resolves as* column makes that visible instead of
leaving you to infer it from a missing component.

Colliding keys are called out explicitly, since only the first registration wins.

Served from a dev-only route (`/__localess`) and re-read per request, so adding or removing a
component is reflected without a restart. Never registered in a production build. Turn it off with
`devtools: false`.

## Reference

| Export | From | Kind |
|---|---|---|
| default module | `@localess/nuxt` | Nuxt module |
| `ModuleOptions` | `@localess/nuxt` | type |
| `useLocalessServerClient()` | `#localess/server` | function |

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

`componentNaming` is applied when the component registry is generated at build time, so it never
reaches `runtimeConfig` and the runtime Vue plugin knows nothing about it. Strategy names only.
