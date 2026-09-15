<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/svelte

The Svelte 5 integration for [Localess](https://github.com/Lessify/localess): a component registry that maps content schemas to your own components, rich text rendering, and Visual Editor live sync.

Hand it a `Content` response and it renders your components recursively, with the attributes the Visual Editor needs to make each block clickable.

**ESM-only**, built with `svelte-package` and gated by `svelte-check`.

## Requirements

- Node.js >= 24.0.0
- Svelte ^5.0.0 (peer dependency)

## Installation

```bash
# npm
npm install @localess/svelte svelte

# yarn
yarn add @localess/svelte svelte

# pnpm
pnpm add @localess/svelte svelte
```

---

## Setup

Call `localessInit()` once in your root layout, registering the components that render your schemas. From the [SvelteKit playground](../../playgrounds/svelte-kit):

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { localessInit } from '@localess/svelte';
  import Button from '$lib/components/localess/Button.svelte';
  import Page from '$lib/components/localess/Page.svelte';

  let { children } = $props();

  localessInit({
    origin: 'https://demo.localess.org',
    spaceId: 'MmaT4DL0kJ6nXIILUcQF',
    token: 'Y4rvboPnyzVeC7LddEK5', // public token — safe for the client bundle
    enableSync: true,
    components: { Page, Button },
  });
</script>

{@render children()}
```

> **Security:** the layout reaches the browser, so only ever pass a **public** (read-only) token to `localessInit`. Secret tokens belong in `+page.server.ts` — see below.

The keys of `components` are your schema ids. `fallbackComponent` renders anything unregistered, instead of a blank space.

---

## Fetching content

Fetch server-side, where SvelteKit guarantees the token never reaches the client bundle:

```ts
// src/routes/[...slug]/+page.server.ts
import { LocalessApiError, localessClient } from '@localess/svelte';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const client = localessClient({
    origin: 'https://demo.localess.org',
    spaceId: 'MmaT4DL0kJ6nXIILUcQF',
    token: 'Y4rvboPnyzVeC7LddEK5', // secret — never imported into a .svelte file
  });

  try {
    const content = await client.getContentBySlug<Page>(params.slug, { locale: 'en' });
    return { content };
  } catch (err) {
    if (err instanceof LocalessApiError && err.status === 404) {
      error(404, `Content not found for slug "${params.slug}".`);
    }
    throw err;
  }
};
```

`localessClient` is re-exported here so you never import `@localess/client` directly. `LocalessApiError` carries `status`, which is how you tell a missing slug from a real failure.

---

## Rendering

`<LocalessDocument>` takes the whole response and handles live sync:

```svelte
<!-- src/routes/[...slug]/+page.svelte -->
<script lang="ts">
  import { LocalessDocument } from '@localess/svelte';
  let { data } = $props();
</script>

<LocalessDocument document={data.content} />
```

A component for one schema receives its block as `data`:

```svelte
<!-- src/lib/components/localess/Page.svelte -->
<script lang="ts">
  import { LocalessComponent, LocalessRichText, localessEditable, localessEditableField } from '@localess/svelte';
  import type { Page } from '../../../shared/models/localess';

  let { data }: { data: Page } = $props();
</script>

<main use:localessEditable={data} class="flex flex-col gap-4">
  <h1 {...localessEditableField<Page>('title')}>{data.title}</h1>

  {#if data.buttons?.length}
    <div class="flex gap-2">
      {#each data.buttons as button (button._id)}
        <LocalessComponent data={button} />
      {/each}
    </div>
  {/if}

  {#if data.content}
    <div {...localessEditableField<Page>('content')} class="prose">
      <LocalessRichText content={data.content} />
    </div>
  {/if}
</main>
```

Nested blocks go back through `<LocalessComponent>`, which looks each one up in the registry by its `_schema` — so `Page` never needs to know what a `Button` is.

---

## Making content editable

The two helpers are used differently, which is easy to trip over:

- **`localessEditable`** is a Svelte **action** — `use:localessEditable={data}`. It applies the block's `data-ll-id` / `data-ll-schema` to the element.
- **`localessEditableField`** returns an attribute object — **spread** it: `{...localessEditableField<Page>('title')}`.

`localessEditableField<T>` is typed against your content type, so a misspelled field name fails to compile rather than producing an attribute the editor quietly ignores.

---

## Rich text

`<LocalessRichText content={…} />` renders the Studio editor's JSON. It's built on [`@localess/richtext`](../richtext) — **no TipTap at runtime**.

---

## Visual Editor sync

With `enableSync: true` and the page running inside the Visual Editor iframe, `<LocalessDocument>` re-renders on every keystroke. The sync stores are exported if you need to react to editor events yourself.

---

## Related

- [`@localess/client`](../client) — the underlying server-side SDK
- [`@localess/richtext`](../richtext) — the rich text model and renderer
- [docs/svelte.md](../../docs/svelte.md) — full reference
- [SvelteKit playground](../../playgrounds/svelte-kit) — the source of the examples above

## License

See the [Localess](https://github.com/Lessify/localess) repository.
