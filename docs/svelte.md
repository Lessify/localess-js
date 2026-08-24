# `@localess/svelte`

Svelte 5 integration for Localess. Rendering-only: component registry, editable attributes, Visual Editor sync, rich-text rendering, and a Vite plugin for component auto-registration. Does not fetch data — see "SSR with SvelteKit" for how server-side fetching fits in.

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

Two ways to register components, usable together (manual entries win on key collision):

1. **Manual** — pass `components: { schemaKey: Component }` to `localessInit({...})`.
2. **Vite plugin** — `@localess/svelte/vite`'s `localess({ componentsDir, components })` auto-globs a folder's `.svelte` files into `virtual:localess-svelte-components`, keyed by kebab-cased filename.

```typescript
// vite.config.ts
import { localess } from '@localess/svelte/vite';

export default defineConfig({
  plugins: [localess({ componentsDir: 'src/lib/components/localess' })],
});
```

```typescript
// +layout.svelte's <script>
// @ts-expect-error -- generated at build time
import { localessComponents } from 'virtual:localess-svelte-components';

localessInit({ origin, spaceId, token, components: localessComponents });
```

## Editable Attributes

```svelte
<LocalessComponent data={blok} />                <!-- applies data-ll-id/data-ll-schema automatically -->
<section use:localessEditable={blok}>...</section> <!-- manual application -->
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
| `localessSync(event)` | Function | Visual Editor bridge event subscription, returns a `Readable` |
| `localessRichText(doc)` | Function | Tiptap JSON → HTML, returns a `Readable<string>` |
| `LocalessApiError` | Class | Re-exported from `@localess/client` |
| `@localess/svelte/vite`'s `localess(options)` | Vite plugin factory | Component auto-registration |

See `packages/svelte/SKILL.md` for the full usage guide (also shipped inside the npm package).
