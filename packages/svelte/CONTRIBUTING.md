# Contributing to @localess/svelte

Svelte 5 integration layer. Depends on `@localess/client`. Components never fetch data — they accept content as props.

`@localess/client` is an implementation detail of this package. Consumer-facing code (playgrounds, docs, examples) must only ever import from `@localess/svelte` — never `@localess/client` directly. If something from `@localess/client` isn't re-exported yet, add it to `src/lib/index.ts`'s re-exports rather than telling consumers to import `@localess/client` themselves.

**`src/lib/models.ts` is the only file allowed to import from `@localess/client`.** Every other file in this package — including `index.ts` — imports the types/values it needs from `./models` (or `../models`, `../../models`, depending on depth) instead. When a new file needs something from `@localess/client` that `models.ts` doesn't re-export yet, add it there first. This keeps the client-package boundary auditable at a single file instead of scattered across every component/store/action.

`@localess/svelte`'s `core/state.ts` (client/registry/sync state) is a hand-ported near-duplicate of `@localess/vue`'s equivalent module — same function names and behavior, Vue's `Component` type swapped for Svelte's. ADR 005 forbids extracting this into a shared package, so keep this a manual-sync discipline: when fixing a bug here, check `packages/vue/src/core/state.ts` for the same bug.

## Package Layout

`@localess/svelte` has a single build root: `src/lib/**` — the library surface (components, actions, stores, context), built by `svelte-package` (ESM-only, ships `.svelte` files as-is).

There is no Vite plugin in this package. Component registration and client initialization both go through `localessInit()` (see "Hard Constraints" below) — pass a `components` map directly rather than auto-discovering it via a Vite virtual module. This was tried (a `src/vite/`-based `localess()` plugin mirroring `@localess/react/vite`) and removed: `localessInit()`'s `setContext` call only works when invoked synchronously during a component's own initialization, and a Vite virtual module's top-level code always finishes evaluating *before* the importing component's function body runs (per the ES module spec) — so a generated module can never safely call it. Don't reintroduce a Vite plugin here without solving that constraint first (e.g. dropping `setContext` in favor of the plain singleton `core/state.ts` already uses).

`svelte-package` also has no way to exclude `*.test.*` files from `dist/` — they get shipped as `.test.js`/`.test.d.ts` alongside real source. This is handled at the `package.json` `files` field level instead, via negation patterns (`"!dist/**/*.test.*"`, `"!dist/__fixtures__"`) — `npm pack`/`npm publish` respect these even though the files still exist locally in `dist/` after a build. Don't try to "fix" this by deleting them from `dist/` in a build step; the negation-pattern approach is simpler and doesn't require a cleanup script.

## Adding a New Store

**1. Create `src/lib/stores/<name>.ts`:**

```typescript
import { readable, type Readable } from 'svelte/store';
import { localessSyncOn } from '../core/state';

export function myStore(): Readable<unknown> {
  return readable(undefined, set => {
    localessSyncOn(/* ... */, set);
    return () => {};
  });
}
```

Rules:
- Subscribe via `localessSyncOn(event, callback)` / `localessSyncOnChange(callback)` from `../core/state`, not `window.localess?.on()` directly — it wraps the `isSyncEnabled()` check and the `localessSyncReady()` wait (avoiding a race where `window.localess` isn't set yet), and narrows the callback's event type.
- `window.localess` has no `.off()` method — the store's unsubscribe function can be a no-op.

**2. Export from `src/lib/index.ts`.**

**3. Add a test** using `svelte/store`'s `get()` to read the current value.

**4. Update `packages/svelte/SKILL.md`** with the store's signature and a usage example.

## Adding a New Action

**1. Create `src/lib/actions/<name>.ts`**, typed as `Action<HTMLElement, T>` from `svelte/action`.

**2. Export from `src/lib/index.ts`.**

**3. Update `packages/svelte/SKILL.md`.**

## Hard Constraints

- **No data fetching in components.** `<LocalessComponent>`, `<LocalessDocument>`, and consumer components accept content (`data`, `assets`, `links`, `references`, or the full `document`) as props only.
- **No dependency on `@localess/react`, `@localess/angular`, `@localess/vue`, or `@localess/cli`.** ADR 005 — depend only on `@localess/client`.
- **No secret token anywhere in this package.** Only a public (read-only) token flows through `localessInit`.
- **`localessInit()` must be called during component initialization**, not inside `onMount`, an event handler, or a `+layout.ts` — Svelte's `setContext` requires it.

## Build

```bash
npm run build:svelte
# or from packages/svelte/
npm run build
```

Runs, in order: `build:lib` (svelte-package), `publint`. Output: `dist/index.js` + `.d.ts`, component `.svelte` files.
