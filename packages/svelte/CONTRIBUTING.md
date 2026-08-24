# Contributing to @localess/svelte

Svelte 5 integration layer. Depends on `@localess/client`. Components never fetch data — they accept content as props.

`@localess/client` is an implementation detail of this package. Consumer-facing code (playgrounds, docs, examples) must only ever import from `@localess/svelte` — never `@localess/client` directly. If something from `@localess/client` isn't re-exported yet, add it to `src/lib/index.ts`'s re-exports rather than telling consumers to import `@localess/client` themselves.

`@localess/svelte`'s `core/state.ts` (client/registry/sync state) is a hand-ported near-duplicate of `@localess/vue`'s equivalent module — same function names and behavior, Vue's `Component` type swapped for Svelte's. ADR 005 forbids extracting this into a shared package, so keep this a manual-sync discipline: when fixing a bug here, check `packages/vue/src/core/state.ts` for the same bug.

## Package Layout — Two Build Roots

Unlike every other package in this repo, `@localess/svelte` has **two independent build roots**:

- `src/lib/**` — the library surface (components, actions, stores, context), built by `svelte-package` (ESM-only, ships `.svelte` files as-is).
- `src/vite/**` — the Vite plugin (`localess()`), built separately via plain `tsc` (declarations) + Vite library mode (JS), producing dual CJS/ESM.

**Never move Vite-plugin files into `src/lib/vite/`.** `svelte-package` processes the entire `src/lib` tree with no exclude option in this tool version — a file placed there gets double-built (once by `svelte-package`, once by the dedicated Vite build) and the two outputs collide in `dist/`. This was a real bug hit during initial implementation; keep the two roots separate.

`svelte-package` always wipes `dist/` before writing (there's no reliable way to make it preserve prior output), so the build order in `package.json`'s `build` script matters: `build:lib` (svelte-package) must run **first**, `build:vite-plugin` **second** (it only adds to `dist/vite/`, `emptyOutDir: false`), and `publint` **last** (it needs both to exist to validate the full `exports` map). Don't reorder this.

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

## Extending the Vite Plugin

The Vite plugin lives in `src/vite/` (not `src/lib/vite/` — see "Package Layout" above):
- `vite-plugin-localess-components.ts` — `virtual:localess-svelte-components`, the component auto-registry.
- `localess.ts` — `localess()`, the public entry point.

Rules:
- The virtual module is generated as a **string**, not a live JS value — a `vite.config.ts` option can't become a live cross-graph reference. Manual `components` overrides must stay file paths, resolved via `this.resolve`, never direct component references.
- Unlike `@localess/react/vite`, this plugin is **single-graph, public-token-only by design** — it never sees or emits a secret token, and there is no `virtual:localess-init` equivalent. Don't add SSR/ssr-graph branching here; SSR data-fetching goes through the app's own `+page.server.ts` calling `@localess/client` directly (see `docs/svelte.md`).
- New `.d.ts` output for this subpath comes from `tsconfig.vite-plugin.json` (plain `tsc --emitDeclarationOnly`), not `vite-plugin-dts` — that plugin's `outDir`/`entryRoot` options didn't produce correct paths for this custom-renamed single-file entry during initial implementation. Don't reintroduce it without verifying the exact output path first.
- Add new tests to the matching `*.test.ts` file, following the existing string-content-assertion style (assert generated code contains expected substrings) rather than evaluating the generated code.

## Hard Constraints

- **No data fetching in components.** `<LocalessComponent>` and consumer components accept `data` as a prop only.
- **No dependency on `@localess/react`, `@localess/angular`, `@localess/vue`, or `@localess/cli`.** ADR 005 — depend only on `@localess/client`.
- **No secret token anywhere in this package.** Only a public (read-only) token flows through `localessInit`/`localess()` (the Vite plugin).
- **`localessInit()` must be called during component initialization**, not inside `onMount`, an event handler, or a `+layout.ts` — Svelte's `setContext` requires it.

## Build

```bash
npm run build:svelte
# or from packages/svelte/
npm run build
```

Runs, in order: `build:lib` (svelte-package), `build:vite-plugin` (tsc + Vite), `publint`. Output: `dist/index.js` + `.d.ts`, component `.svelte` files, `dist/vite/index.{js,mjs,d.ts}`.
