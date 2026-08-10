# @localess/astro Reference

Astro integration layer for Localess. Builds on `@localess/client` and adds a component registry and Visual Editor sync. No other UI framework dependency.

**Peer dependency:** Astro 4 or 5.

## Why one entry point (unlike @localess/react's three)

`@localess/react` ships `@localess/react`, `/ssr`, and `/rsc` because React Server Components split the module graph between server and client bundles, and different exports need to be visible/invisible on each side. Astro components are server-rendered by default with no such split — `@localess/astro` has one entry point, `@localess/astro`, plus three `.astro` subpath exports (`/LocalessComponent.astro`, `/LocalessDocument.astro`, `/LocalessSync.astro`) required because `.astro` files can't be re-exported through a `.ts` barrel.

## Installation

```bash
npm install @localess/astro
```

## Initialization

```astro
---
import { localessInit } from '@localess/astro';
import Page from '../shared/components/localess/Page.astro';

localessInit({
  origin: import.meta.env.LOCALESS_ORIGIN,
  spaceId: import.meta.env.LOCALESS_SPACE_ID,
  token: import.meta.env.LOCALESS_TOKEN,
  enableSync: import.meta.env.DEV,
  components: { Page },
  fallbackComponent: UnknownBlock,
});
---
```

Call it once, in frontmatter, before rendering. Safe to call again (idempotent overwrite) if a page's frontmatter re-runs it with the same values on every request — that's expected in Astro's per-request execution model, unlike Next.js where a single root layout module runs once.

## Component Registry

```typescript
import { registerComponent, unregisterComponent, setComponents, getComponent, setFallbackComponent } from '@localess/astro';
```

Schema keys must match `_schema` exactly.

## Rendering

`LocalessDocument` (import from `@localess/astro/LocalessDocument.astro`) renders a full `Content<T>` object and conditionally emits `LocalessSync`. `LocalessComponent` (import from `@localess/astro/LocalessComponent.astro`) renders a single content block by schema — use it directly for nested blocks (e.g. inside a custom container component's own `.astro` template). Both are **default** exports.

## Visual Editor Sync

When `enableSync: true`, `LocalessDocument` renders `LocalessSync` — a `<script>`-only island (no `client:*` directive; that directive is for hydrating UI-framework components, and a plain `<script>` in an `.astro` file is already client JS Astro bundles on its own). It loads the same `sync-v1.js` script `@localess/react` uses, and on any edit event, debounces ~500ms then calls `window.location.reload()`.

This is a full reload, not a live DOM patch — deliberately. Structural edits (added/removed content blocks) need a reload regardless of what happens for text edits, and Astro ships no client-side re-renderer for its own output the way React does, so a reload-only strategy is simpler and no less correct for the common case. A debounced, `morphdom`-style live-patch for text-only edits (following `@storyblok/astro`'s prior art) is a documented future enhancement, not built in this version.

## Testing your own components

Use Astro's `experimental_AstroContainer` (`astro/container`) — see `packages/astro/CONTRIBUTING.md` for a worked example. Note: a hand-rolled mock object is not a valid component to register in the registry for a test — Astro's renderer requires `Component.isAstroComponentFactory === true`, which only the `.astro` compiler sets, so use a real fixture `.astro` file instead.
