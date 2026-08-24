# Contributing to @localess/vue

Vue 3 integration layer. Depends on `@localess/client`. Components never fetch data — they accept content as props.

`@localess/client` is an implementation detail of this package. Consumer-facing code (playgrounds, docs, examples) must only ever import from `@localess/vue` — never `@localess/client` directly. If something from `@localess/client` isn't re-exported yet, add it to `src/index.ts`'s re-exports rather than telling consumers to import `@localess/client` themselves.

**`src/core/models.ts` is the only file allowed to import from `@localess/client` directly.** Every other file in this package — including `index.ts` — imports the types/values it needs from `./core/models` (or the correct relative path, e.g. `../core/models` from a sibling directory) instead. When a new file needs something from `@localess/client` that `models.ts` doesn't re-export yet, add it there first. This keeps the client-package boundary auditable at a single file instead of scattered across every component/composable/directive.

`@localess/vue`'s `core/state.ts` (client/registry/sync state) is a hand-ported near-duplicate of `@localess/svelte`'s equivalent module — same function names and behavior, `vue`'s `Component` type swapped for Svelte's. ADR 005 forbids extracting this into a shared package, so keep this a manual-sync discipline: when fixing a bug here, check `packages/svelte/src/lib/core/state.ts` for the same bug. `src/core/models.ts` should likewise stay structurally parallel to `packages/svelte/src/lib/models.ts` — same shape (a short header comment plus `export type { ... }` / `export { ... }` blocks from `@localess/client`), so a re-export added on one side is easy to mirror on the other.

## Adding a New Composable

**1. Create `src/composables/use-<name>.ts`:**

```typescript
import { getLocalessClient, localessSyncOn } from '../core/state';

export function useMyComposable(param: string) {
  // subscribe via localessSyncOn(event, callback), not window.localess directly
}
```

Rules:
- Subscribe via `localessSyncOn(event, callback)` / `localessSyncOnChange(callback)` from `../core/state`, not `window.localess?.on()` directly — it wraps the `isSyncEnabled()` check and the `localessSyncReady()` wait (avoiding a race where `window.localess` isn't set yet), and narrows the callback's event type.
- `window.localess` has no `.off()` method — do not attempt cleanup.
- Never fetch data eagerly at module scope — only inside the composable body, so it re-runs per component instance.

**2. Export from `src/index.ts`.**

**3. Add a test** — mount a minimal component that calls the composable via `@vue/test-utils`' `mount()`.

**4. Update `packages/vue/SKILL.md`** with the composable's signature and a usage example.

## Adding a New Directive

**1. Create `src/directives/<name>.ts`**, typed as `ObjectDirective<HTMLElement, T>` (not the broader `Directive` union — that type loses the `mounted`/`updated` hook properties on the binding when accessed externally, e.g. in tests).

**2. Export from `src/index.ts`.**

**3. Update `packages/vue/SKILL.md`.**

## Extending the Vite Plugin

The Vite plugin lives in `src/vite/`:
- `vite-plugin-localess-components.ts` — `virtual:localess-vue-components`, the component auto-registry.
- `localess.ts` — `localess()`, the public entry point.

Rules:
- The virtual module is generated as a **string**, not a live JS value — a `vite.config.ts` option can't become a live cross-graph reference. Manual `components` overrides must stay file paths, resolved via `this.resolve`, never direct component references.
- Unlike `@localess/react/vite`, this plugin is **single-graph, public-token-only by design** — it never sees or emits a secret token, and there is no `virtual:localess-init` equivalent. Don't add SSR/ssr-graph branching here; SSR data-fetching goes through the app's own server files calling `@localess/client` directly (see `docs/vue.md`).
- Add new tests to the matching `*.test.ts` file, following the existing string-content-assertion style (assert generated code contains expected substrings) rather than evaluating the generated code.

## Hard Constraints

- **No data fetching in components.** `<LocalessComponent>` and consumer components accept `data` as a prop only.
- **No dependency on `@localess/react`, `@localess/angular`, `@localess/svelte`, or `@localess/cli`.** ADR 005 — depend only on `@localess/client`.
- **No secret token anywhere in this package.** Only a public (read-only) token flows through `Localess`/`localessInit`/`localess()` (the Vite plugin).

## Build

```bash
npm run build:vue
# or from packages/vue/
npm run build
```

Output: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`, `dist/vite/index.{js,mjs,d.ts}`.
