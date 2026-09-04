# Contributing to @localess/vue

Vue 3 integration layer. Depends on `@localess/client`, `@localess/model`, and `@localess/richtext`. Components never fetch data — they accept content as props.

`@localess/client` is an implementation detail of this package. Consumer-facing code (playgrounds, docs, examples) must only ever import from `@localess/vue` — never `@localess/client` directly. If something from `@localess/client` isn't re-exported yet, add it to `src/index.ts`'s re-exports rather than telling consumers to import `@localess/client` themselves.

**`src/models/index.ts`, `src/utils/index.ts`, and `src/client.ts` are the only files allowed to import from `@localess/client` directly.** Each has one job:
- `models/index.ts` — every `@localess/client` **type** the package needs, plus `LocalessApiError` (a class, but consumed in type position via `catch`/`instanceof`, so it lives with the domain model). It is also the only file importing `@localess/model` (domain types: `Content`, `ContentData`, `Assets`, `Links`, `References`, ...) and the richtext model types. Sibling `models/components.ts` holds the package-specific prop types (`LocalessComponentProps`, `LocalessDocumentProps`, `LocalessSchemaProps`) built from what the barrel already re-exports, and imports from `../models` rather than any `@localess/*` package.
- `utils/index.ts` — every `@localess/client` plain **function** the package needs (`isBrowser`, `isIframe`, `loadLocalessSync`, `localessEditable`, `localessEditableField`). Not `localessClient` — see below.
- `client.ts` — the one place that calls `localessClient(...)` and wraps it in the singleton (client instance + component registry + Visual Editor sync state) that the rest of the package reads through `localessInit()`/`getLocalessClient()`. `localessClient` is a callable factory, not a type or a stateless helper, so it's imported here directly rather than re-exported through `models` or `utils`. `client.ts` also re-exports `localessClient` itself (raw, unwrapped) — `index.ts` re-exports that in turn, so SSR consumer code (e.g. a Nuxt server route) can build its own client instance with a secret token, outside the `Localess` plugin's singleton lifecycle, without ever importing `@localess/client` directly. See "SSR with Nuxt" in `docs/vue.md`.

Every other file in this package — including `index.ts` — imports what it needs from `./models`/`../models`, `./utils`/`../utils`, or `./client`/`../client` (relative path per file depth) instead. When a new file needs something from `@localess/client` that none of the three re-exports yet, add it to whichever matches. This keeps the client-package boundary auditable at three well-known files instead of scattered across every component/composable.

The same discipline applies to `@localess/richtext` (ADR 007): **`src/richtext.ts` is the only file allowed to import `@localess/richtext` values** — it hosts the VNode walker and re-exports what the component/composables need; `src/models/index.ts` re-exports the richtext model **types** (`LocalessRichTextNode` etc.). Everything else imports through `./richtext`/`../richtext` or the models barrel.

`@localess/vue`'s `client.ts` (client/registry/sync state) is a hand-ported near-duplicate of `@localess/svelte`'s equivalent module — same function names and behavior, `vue`'s `Component` type swapped for Svelte's. ADR 005 forbids extracting this into a shared package, so keep this a manual-sync discipline: when fixing a bug here, check `packages/svelte/src/lib/client.ts` for the same bug. `src/models/` and `src/utils/` should likewise stay structurally parallel to `packages/svelte/src/lib/models/` and `packages/svelte/src/lib/utils/` — same shape, so a re-export added on one side is easy to mirror on the other.

## Adding a New Composable

**1. Create `src/composables/use-<name>.ts`:**

```typescript
import { getLocalessClient, localessSyncOn } from '../client';

export function useMyComposable(param: string) {
  // subscribe via localessSyncOn(event, callback), not window.localess directly
}
```

Rules:
- Subscribe via `localessSyncOn(event, callback)` / `localessSyncOnChange(callback)` from `../client`, not `window.localess?.on()` directly — it wraps the `isSyncEnabled()` check and the `localessSyncReady()` wait (avoiding a race where `window.localess` isn't set yet), and narrows the callback's event type.
- `window.localess` has no `.off()` method — do not attempt cleanup.
- Never fetch data eagerly at module scope — only inside the composable body, so it re-runs per component instance.

**2. Export from `src/index.ts`.**

**3. Add a test** — mount a minimal component that calls the composable via `@vue/test-utils`' `mount()`.

**4. Update `packages/vue/SKILL.md`** with the composable's signature and a usage example.

## Editable Attributes Are Plain Functions, Not Directives

This package ships no Vue directives. `localessEditable(data)` and `localessEditableField(name)` are the `@localess/client` functions re-exported through `src/utils/index.ts` and `src/index.ts`; consumers bind their returned attribute objects with `v-bind`, and `<LocalessComponent>` does the same internally (`v-bind="localessEditable(data)"`). The earlier `vLocalessEditable` directive (`src/directives/`) was removed in favour of this — one function shape shared with every other framework package, no per-framework directive API to keep in sync.

If a directive ever becomes genuinely necessary, put it in `src/directives/<name>.ts` typed as `ObjectDirective<HTMLElement, T>` (not the broader `Directive` union — that type loses the `mounted`/`updated` hook properties on the binding when accessed externally, e.g. in tests), export it from `src/index.ts`, and document it in `packages/vue/SKILL.md`.

## Extending the Vite Plugin

The Vite plugin lives in `src/vite/`:
- `vite-plugin-localess-components.ts` — `virtual:localess-vue-components`, the component auto-registry.
- `localess.ts` — `localess()`, the public entry point.

Rules:
- The virtual module is generated as a **string**, not a live JS value — a `vite.config.ts` option can't become a live cross-graph reference. Manual `components` overrides must stay file paths, resolved via `this.resolve`, never direct component references.
- Unlike `@localess/react/vite`, this plugin is **single-graph, public-token-only by design** — it never sees or emits a secret token, and there is no `virtual:localess-init` equivalent. Don't add SSR/ssr-graph branching here; SSR data-fetching goes through the app's own server files calling `localessClient` (re-exported from `@localess/vue`, never `@localess/client` directly) with a secret token (see `docs/vue.md`).
- Add new tests to the matching `*.test.ts` file, following the existing string-content-assertion style (assert generated code contains expected substrings) rather than evaluating the generated code.

## Hard Constraints

- **No data fetching in components.** `<LocalessComponent>`, `<LocalessDocument>`, and consumer components accept content (`data`, `assets`, `links`, `references`, or the full `document`) as props only.
- **No dependency on `@localess/react`, `@localess/angular`, `@localess/svelte`, or `@localess/cli`.** ADR 005 — depend only on `@localess/client`, `@localess/model`, and `@localess/richtext`.
- **No secret token anywhere in this package.** Only a public (read-only) token flows through `Localess` (and the internal `localessInit` it calls) or `localess()` (the Vite plugin).
- **`localessInit`, `getLocalessClient`, and `LocalessVueInitOptions` are internal.** Only the `Localess` plugin, `useLocaless()`, and `LOCALESS_INJECTION_KEY` are public — `src/index.ts` re-exports just `localessClient` from `client.ts`.

## Build

```bash
npm run build:vue
# or from packages/vue/
npm run build
```

Runs `typecheck` (`vue-tsc --noEmit`) before `vite build` (`vite.config.mts`, library mode with two entries: `src/index.ts` and `src/vite/index.ts`; `preserveModules` keeps one output file per source module) — `vite build`/`vite-plugin-dts` alone don't type-check `.vue` SFCs, so `npm run typecheck` on its own is the fast way to check types without building. Output: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`, `dist/vite/index.{js,mjs,d.ts}`, matching the `.` and `./vite` entries of the `package.json` `exports` map.
