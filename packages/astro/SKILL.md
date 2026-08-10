# @localess/astro

Astro integration layer for Localess. Builds on `@localess/client` and adds a component registry and Visual Editor sync — no other framework dependency required.

**Peer dependency:** Astro 6 or 7.

## Installation

```bash
npm install @localess/astro
```

## Initialization

Call `localessInit()` once, in the frontmatter of the page (or a shared module imported by every page) before rendering:

```astro
---
import { localessInit } from '@localess/astro';
import Page from '../shared/components/localess/Page.astro';

localessInit({
  origin: import.meta.env.LOCALESS_ORIGIN,
  spaceId: import.meta.env.LOCALESS_SPACE_ID,
  token: import.meta.env.LOCALESS_TOKEN,
  enableSync: import.meta.env.DEV,
  components: {
    Page,
  },
});
---
```

> **Security:** `token` must never reach the browser. Only call `localessInit` from `.astro` frontmatter (server-rendered), never from a `<script>` block.

## Rendering content

```astro
---
import { getLocalessClient, LocalessDocument } from '@localess/astro';

const content = await getLocalessClient().getContentBySlug('home');
---

<LocalessDocument document={content} />
```

`LocalessDocument` renders the matched component for `content.data._schema` and, when `enableSync` was passed to `localessInit`, also renders `LocalessSync` — a script-only island that reloads the page on Visual Editor edit events (debounced ~500ms). No live DOM patching in this version; structural edits (added/removed blocks) always need a reload, so this SDK doesn't attempt a partial-patch path.

To render a nested block directly (e.g. inside a custom component), use `LocalessComponent`:

```astro
---
import { LocalessComponent } from '@localess/astro';
---

{data.body.map(item => <LocalessComponent data={item} links={content.links} references={content.references} />)}
```

## Component registry

```typescript
import { registerComponent, unregisterComponent, setComponents, getComponent, setFallbackComponent } from '@localess/astro';
```

Same semantics as `@localess/react`'s registry — schema keys are exact-match strings against `_schema`.

## Import paths — subpath exports required for `.astro` files

`LocalessComponent`, `LocalessDocument`, and `LocalessSync` **cannot** be imported from the package's default entry point (`@localess/astro`) — `.astro` files can't be re-exported through a `.ts` barrel. Import them from their dedicated subpaths instead:

```typescript
import LocalessComponent from '@localess/astro/LocalessComponent.astro';
import LocalessDocument from '@localess/astro/LocalessDocument.astro';
import LocalessSync from '@localess/astro/LocalessSync.astro';
```

Everything else (`localessInit`, registry functions, model types, `isBrowser`, `isIframe`) imports from the default entry point (`@localess/astro`) as shown above.
