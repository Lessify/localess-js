# SKILL: @localess/svelte

## Overview

`@localess/svelte` is the **Svelte 5 integration layer** for Localess. It builds on `@localess/client` and adds:

- A **component registry** mapping Localess schema keys to Svelte components, set up via `localessInit()` and Svelte context
- `<LocalessComponent>` — dynamic content renderer
- `<LocalessDocument>` — wraps `<LocalessComponent>` with automatic Visual Editor live sync
- `localessEditable` — a Svelte action applying Visual Editor editable attributes
- **Visual Editor sync** support via the `localessSync` store
- **Rich text** rendering from Tiptap JSON via `<LocalessRichText>` (built on `@localess/richtext`, no TipTap at runtime)

**Peer dependency:** Svelte `^5.0.0`.

**Rendering-only package.** `@localess/svelte` does not fetch data for you. For CSR, call `getLocaless().getContentBySlug(...)` yourself. For SSR (e.g. SvelteKit), fetch with `@localess/client` directly in a `+page.server.ts` `load()` function, using a **secret** token — SvelteKit guarantees `.server.ts` files never reach the client bundle. See "SSR with SvelteKit" below.

---

## Installation

```bash
npm install @localess/svelte svelte
```

---

## CSR Setup

Call `localessInit()` once, synchronously, during a root component's initialization — this is a hard Svelte constraint (`setContext` only works during component init), so it must run at the top of a `<script>` block, typically in a root `+layout.svelte`, not inside `onMount` or a `+layout.ts`:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { localessInit } from '@localess/svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  localessInit({
    origin: import.meta.env.VITE_LOCALESS_ORIGIN,
    spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
    token: import.meta.env.VITE_LOCALESS_TOKEN, // public token — safe for the browser bundle
    components: { page: Page, button: Button },
    enableSync: true, // only meaningful inside the Localess Visual Editor iframe
  });
</script>

{@render children()}
```

> **Security:** only ever pass a **public** (read-only) token here — this runs in the browser. Never pass a secret token to `localessInit`.

---

## `<LocalessComponent>`

Dynamically renders a Localess content block by looking up its `_schema` in the component registry. Always applies `localessEditable(data)`'s `data-ll-id`/`data-ll-schema` attributes to the rendered component's root. Accepts `assets`, `links`, and `references` alongside `data` and forwards all four to the resolved component (or `fallbackComponent`) — registered components should declare the same four props (typed with `LocalessSchemaProps<T>`) and pass `assets`/`links`/`references` through when rendering nested `<LocalessComponent>`s. `LocalessComponentProps` is the renderer's own props type; use `LocalessSchemaProps` for your registered components.

```svelte
<script lang="ts">
  import { LocalessComponent, type LocalessSchemaProps } from '@localess/svelte';
  let { data, assets, links, references }: LocalessSchemaProps = $props();
</script>

<main>
  <h1>{data.title}</h1>
  {#each data.body ?? [] as item (item._id)}
    <LocalessComponent data={item} {assets} {links} {references} />
  {/each}
</main>
```

Falls back to `fallbackComponent` (if registered) when the schema key is unregistered, or renders an inline error message as a last resort.

---

## `<LocalessDocument>`

Wraps `<LocalessComponent>` and subscribes to Visual Editor `input`/`change` events automatically (when `enableSync` is active), re-rendering with the updated content in place. Does not fetch content — pass the full `Content` object as `document`.

```svelte
<script lang="ts">
  import { getLocaless, LocalessDocument } from '@localess/svelte';

  const content = await getLocaless().getContentBySlug('home');
</script>

<LocalessDocument document={content} />
```

Renders an inline error message if `document.data` is missing. Prefer this over `<LocalessComponent>` for the top-level content of a page when Visual Editor sync should apply; use `<LocalessComponent>` directly for nested blocks within an already-synced tree.

---

## `localessEditable` action

Applies the same `data-ll-id`/`data-ll-schema` attributes directly to an element, for cases not going through `<LocalessComponent>`:

```svelte
<section use:localessEditable={data}>
  ...
</section>
```

---

## `localessEditableField()`

A plain function (not an action — the field name is static, known at author time) returning `{ 'data-ll-field': fieldName }`. Spread it onto the element rendering a single field, so editors can click-to-edit that field directly instead of only the whole block:

```svelte
<script lang="ts">
  import { localessEditableField } from '@localess/svelte';
  import type { Page } from '../shared/models/localess';
</script>

<h1 {...localessEditableField<Page>('title')}>{data.title}</h1>
```

Type-safe: `fieldName` must be a key of `Page` (excluding `_id`/`_schema`). Use alongside `localessEditable` on the block root, not instead of it.

---

## `getLocaless()`

Returns the client from Svelte context. Throws if called outside a component tree where `localessInit()` ran.

```svelte
<script lang="ts">
  import { getLocaless } from '@localess/svelte';

  const content = await getLocaless().getContentBySlug('home');
</script>
```

---

## `localessSync` store

Subscribes to Visual Editor bridge events (`input`, `change`, etc.) and exposes the latest matching event as a readable store. No-ops when `enableSync` was not set (or outside the Visual Editor iframe).

```svelte
<script lang="ts">
  import { localessSync } from '@localess/svelte';

  const latest = localessSync(['input', 'change']);
</script>

<p>{$latest?.data}</p>
```

---

## `<LocalessRichText>` component

Renders a Tiptap JSON rich-text document — built on `@localess/richtext`, reactive via `$derived` (updates when `content` changes, e.g. Visual Editor live sync).

```svelte
<script lang="ts">
  import { LocalessRichText } from '@localess/svelte';

  let { data }: { data: { body?: unknown } } = $props();
</script>

<LocalessRichText content={data.body} />
```

Per-node overrides are string-based renderers:

```svelte
<LocalessRichText content={data.body} renderers={{ paragraph: ({ children }) => `<p class="prose">${children}</p>` }} />
```

---

## SSR with SvelteKit

`@localess/svelte` doesn't own data-fetching, so SSR looks like any other SvelteKit data flow: fetch with `localessClient` (re-exported from `@localess/svelte` — never import `@localess/client` directly) in a `+page.server.ts` `load()` function (secret token), and pass the result to the page via `data`.

```typescript
// src/routes/[...slug]/+page.server.ts
import { localessClient } from '@localess/svelte';
import { LOCALESS_ORIGIN, LOCALESS_SPACE_ID, LOCALESS_TOKEN } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const client = localessClient({
    origin: LOCALESS_ORIGIN,
    spaceId: LOCALESS_SPACE_ID,
    token: LOCALESS_TOKEN, // secret, server-only
  });
  return { content: await client.getContentBySlug(params.slug || 'home') };
};
```

```svelte
<!-- src/routes/[...slug]/+page.svelte -->
<script lang="ts">
  import { LocalessDocument } from '@localess/svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<LocalessDocument document={data.content} />
```

SvelteKit's own `data`-prop serialization hydrates the server-fetched result to the client — `@localess/svelte` needs no hydration mechanism of its own. Call `localessInit()` in the root `+layout.svelte` with a **public** token only if you also want Visual Editor sync on top — `LocalessDocument` picks up live `input`/`change` events automatically; use `LocalessComponent` instead if you don't need sync.

---

## Exports Reference

```typescript
// Context & init
export { localessInit }             // Initializes the client + component registry, sets Svelte context
export { getLocaless }              // Returns the client from context
export { localessClient }           // Raw client factory (re-exported from @localess/client), for standalone SSR data-loading outside localessInit

// Rendering
export { LocalessComponent }        // Dynamic schema-to-component renderer
export { LocalessDocument }         // Wraps LocalessComponent with automatic Visual Editor live sync
export { localessEditable }         // use:localessEditable action
export { localessEditableField }    // Field-level data-ll-field attribute, spread onto an element

// Reactivity
export { localessSync }             // Visual Editor bridge event subscription, returns a Readable
export { LocalessRichText }         // Rich text component (content, renderers?), reactive via $derived

// Error handling (re-exported from @localess/client)
export { LocalessApiError }

// Component prop types (local)
export type { LocalessComponentProps, LocalessDocumentProps, LocalessSchemaProps, LocalessSvelteInitOptions }

// Client types (re-exported from @localess/client)
export type { EventToAppOf, EventToAppType, LocalessClient, LocalessClientOptions }

// Domain types (re-exported from @localess/model)
export type { Assets, Content, ContentData, ContentDataSchema, Links, References }

// Rich text types (re-exported from @localess/richtext)
export type { LocalessRichTextDocument, LocalessRichTextInput, LocalessRichTextMark, LocalessRichTextNode }
```
