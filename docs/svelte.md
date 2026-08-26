# `@localess/svelte`

Svelte 5 integration for Localess. Rendering-only: component registry, editable attributes, Visual Editor sync, rich-text rendering. Does not fetch data — see "SSR with SvelteKit" for how server-side fetching fits in. There is no Vite plugin — register components by passing a `components` map to `localessInit()` directly (see "Component Registry" below for why).

**Peer dependency:** Svelte `^5.0.0`.

## Installation

```bash
npm install @localess/svelte svelte
```

## CSR Quick Start

`localessInit()` must run synchronously during a component's initialization (Svelte's `setContext` constraint) — call it at the top of a root `+layout.svelte`'s `<script>`, not inside `onMount`:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { localessInit } from '@localess/svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  localessInit({
    origin: import.meta.env.VITE_LOCALESS_ORIGIN,
    spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
    token: import.meta.env.VITE_LOCALESS_TOKEN, // public token only
    components: { page: Page, button: Button },
    enableSync: true,
  });
</script>

{@render children()}
```

```svelte
<script lang="ts">
  import { getLocaless, LocalessComponent } from '@localess/svelte';

  const content = await getLocaless().getContentBySlug('home');
</script>

<LocalessComponent data={content.data} assets={content.assets} links={content.links} references={content.references} />
```

## `LocalessDocument` — static renderer + live sync

Wraps `LocalessComponent` and subscribes to Visual Editor `input`/`change` events automatically when `enableSync` is active, updating the rendered content in place. Does not fetch content — pass the full `Content` object (e.g. from `getLocaless().getContentBySlug(...)` or a SvelteKit `load()` function) as the `document` prop.

```svelte
<script lang="ts">
  import { getLocaless, LocalessDocument } from '@localess/svelte';

  const content = await getLocaless().getContentBySlug('home');
</script>

<LocalessDocument document={content} />
```

Prefer `LocalessDocument` over `LocalessComponent` whenever the rendered content should update live inside the Visual Editor iframe; use `LocalessComponent` directly for nested blocks within an already-synced tree.

## Component Registry

Pass `components: { schemaKey: Component }` to `localessInit({...})` directly:

```svelte
<script lang="ts">
  import { localessInit } from '@localess/svelte';
  import Page from './lib/components/localess/Page.svelte';
  import Button from './lib/components/localess/Button.svelte';

  localessInit({ origin, spaceId, token, components: { page: Page, button: Button } });
</script>
```

There's no Vite plugin auto-discovering these from a folder. That was tried and removed: `localessInit()`'s `setContext` call only works when it runs synchronously during a component's own initialization, and a Vite virtual module's top-level code always finishes evaluating *before* the importing component's function body runs — so a plugin-generated module can never safely drive it.

## Editable Attributes

```svelte
<LocalessComponent data={blok} />                <!-- applies data-ll-id/data-ll-schema automatically -->
<section use:localessEditable={blok}>...</section> <!-- manual application -->
<h1 {...localessEditableField<Page>('title')}>{blok.title}</h1> <!-- field-level, spread onto the element -->
```

## Visual Editor Sync

`enableSync: true` (in `localessInit({...})`) injects the sync script and activates the `localessSync` store. It's a no-op outside the Localess Visual Editor iframe.

```svelte
<script lang="ts">
  import { localessSync } from '@localess/svelte';

  const latest = localessSync(['input', 'change']);
</script>

<p>{$latest?.data}</p>
```

## Rich Text Rendering

```svelte
<script lang="ts">
  import { localessRichText } from '@localess/svelte';

  let { data }: { data: { body?: unknown } } = $props();
  const html = localessRichText(data.body as any);
</script>

{@html $html}
```

## SSR with SvelteKit

`@localess/svelte` is rendering-only — SSR data-fetching goes through SvelteKit's own `+page.server.ts` `load()` convention, calling `@localess/client` directly with a **secret** token:

```typescript
// src/routes/[...slug]/+page.server.ts
import { localessClient } from '@localess/client';
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

SvelteKit's own `data`-prop serialization hydrates the server-fetched result to the client — `@localess/svelte` needs no hydration mechanism of its own. Call `localessInit()` in the root `+layout.svelte` with a **public** token only if you also want Visual Editor sync on top, then `LocalessDocument` picks up live `input`/`change` events automatically; use `LocalessComponent` instead if you don't need sync.

## API Reference

| Export | Kind | Description |
|---|---|---|
| `localessInit(options)` | Function | Initializes the client + component registry, sets Svelte context |
| `getLocaless()` | Function | Returns the client from context |
| `LocalessComponent` | Component | Dynamic schema-to-component renderer |
| `LocalessDocument` | Component | Wraps `LocalessComponent` and re-renders on Visual Editor sync events |
| `localessEditable` | Action | Applies `data-ll-id`/`data-ll-schema` |
| `localessEditableField(name)` | Function | Applies `data-ll-field`, spread onto an element |
| `localessSync(event)` | Function | Visual Editor bridge event subscription, returns a `Readable` |
| `localessRichText(doc)` | Function | Tiptap JSON → HTML, returns a `Readable<string>` |
| `LocalessApiError` | Class | Re-exported from `@localess/client` |

See `packages/svelte/SKILL.md` for the full usage guide (also shipped inside the npm package).
