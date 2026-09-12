# Localess JS SDK — Contributor Guide

@AGENTS.md

This is a monorepo containing the official JavaScript/TypeScript SDKs for the Localess headless CMS. Twelve packages:

- `@localess/model` — Shared domain-model types (Content, ContentAsset, ContentLink, ContentReference, ContentRichText, Locale, Space, Translations, and related shapes). Zero dependencies.
- `@localess/client` — Core server-side-only SDK. Zero external dependencies (depends on `@localess/model`).
- `@localess/richtext` — Framework-neutral rich text model, renderer, and HTML/Markdown parsers. Zero dependencies (not even `@localess/client`) beyond `@localess/model`.
- `@localess/live-preview` — Framework-neutral Visual Editor bridge (sync script loading, `data-ll-*` attributes, editor events, shared sync controller). Zero dependencies beyond `@localess/model` (see ADR 013).
- `@localess/schema` — Programmatic schema definitions with TypeScript content type inference. Zero dependencies (not even `@localess/client`) beyond `@localess/model`.
- `@localess/react` — React integration (components, hooks, rich text, Visual Editor sync).
- `@localess/angular` — Angular integration (components, directives, pipes, Visual Editor sync).
- `@localess/vue` — Vue integration (components, composables, Vite plugin).
- `@localess/svelte` — Svelte integration (components, actions, context).
- `@localess/astro` — Astro integration (integration, components, live preview).
- `@localess/nuxt` — Nuxt module wrapping `@localess/vue` (config-driven setup, component auto-registration, public/secret token split, server client).
- `@localess/cli` — CLI for translations, type generation, and schema pull/push. Depends on `@localess/client`, `@localess/model`, and `@localess/schema`.

Dependency graph: three roots, `@localess/model`, `@localess/richtext`, and `@localess/schema`, which depend on nothing (see ADR 007, ADR 008, ADR 009). `@localess/live-preview` depends on `@localess/model`. `@localess/client` depends on `@localess/model` and `@localess/live-preview` (deprecated re-exports only — see ADR 013). `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, and `@localess/astro` depend on `@localess/client`, `@localess/model`, `@localess/richtext`, and `@localess/live-preview`; `@localess/cli` depends on `@localess/client`, `@localess/model`, and `@localess/schema`. `@localess/nuxt` depends on `@localess/vue` — the single sanctioned framework-to-framework edge (see ADR 011). Otherwise dependent packages never depend on each other.

## Quick Reference

```bash
# Build all packages (model, richtext, client, schema, react, vue, svelte, cli, angular, astro)
npm run build

# Build individual packages
npm run build:model     # must be built before running client/richtext/schema tests
npm run build:richtext   # must be built before running framework package tests
npm run build:live-preview  # must be built before build:client
npm run build:client
npm run build:schema     # must be built before running @localess/cli tests
npm run build:react
npm run build:vue
npm run build:svelte
npm run build:cli
npm run build:angular
npm run build:astro
npm run build:nuxt      # requires build:vue first

# Run Angular playgrounds (requires build:angular first)
npm run start:angular-ssr      # Angular CLI, SSR
npm run start:angular-static   # Angular CLI, prerendered
npm run start:analog           # AnalogJS (Vite + Nitro), SSR
npm run start:analog-static    # AnalogJS, prerendered

# Run all package tests (vitest everywhere, including @localess/angular via Angular CLI's unit-test builder)
npm test

# Run a single package's tests
npm test --workspace=@localess/angular

# Run a single test file
npx vitest run packages/cli/src/commands/login/login.test.ts
```

Requirements: Node.js >= 24.0.0, npm >= 10.

## Contributor Rules — Never Violate

1. **Never commit.** Never run `git commit` or any command that creates a commit. Make file changes and stop — the developer reviews all changes and commits themselves when ready.

2. **`@localess/client` is server-side only, with one exception.** Never suggest using it in browser/client-side code, and a secret token must never be exposed client-side. The one exception: Localess now also issues **public tokens** (read-only, published content and translations only) that are safe to use client-side — currently supported in `@localess/react` (its client-side `LocalessDocument` fallback for static export, where `localessInit()` is called again client-side with a public token), `@localess/angular` (its unified `provideLocaless({ token, ... })`, where the token's type is determined by the app's rendering mode), `@localess/vue` (the `Localess` plugin's `token` in CSR apps), and `@localess/svelte` (`localessInit({ token })` in CSR apps). `@localess/cli` and `@localess/astro` have not been reworked for this yet — treat their token as secret-only until they are. See `docs/decisions/001-server-side-only.md`.

3. **`@localess/model` has zero dependencies of any kind; `@localess/richtext`, `@localess/schema`, and `@localess/live-preview` depend on `@localess/model` alone; `@localess/client` depends on `@localess/model` and `@localess/live-preview`.** `packages/model/package.json` has no `dependencies` key at all and must stay that way. `packages/richtext/package.json`, `packages/schema/package.json`, and `packages/live-preview/package.json` each have exactly one `dependencies` entry, `@localess/model`; `packages/client/package.json` has exactly two, `@localess/model` and `@localess/live-preview` (ADR 013) — never add anything else to `dependencies` in any of the five. All five remain zero-*external*-dependency (no npm package outside this monorepo). `devDependencies` are fine (e.g. TipTap in richtext, used only by its parity test). See `docs/decisions/002-zero-production-deps.md`, `docs/decisions/007-shared-richtext-package.md`, `docs/decisions/008-schema-package.md`, and `docs/decisions/009-shared-model-package.md`.

4. **Package boundaries.** `@localess/live-preview` depends on `@localess/model`. `@localess/client` depends on `@localess/model` and `@localess/live-preview`. `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, and `@localess/astro` depend on `@localess/client`, `@localess/model`, `@localess/richtext`, and `@localess/live-preview`; `@localess/cli` depends on `@localess/client`, `@localess/model`, and `@localess/schema`. Dependent packages never depend on each other, and root packages never depend on anything. **One exception:** a framework package may depend on another framework package when it is a host-framework-specific *wrapper* around it — a strict superset relationship, not a shared-utility one. `@localess/nuxt` → `@localess/vue` is the only such edge today (Nuxt is Vue); anything shared between siblings belongs in a root package instead. See `docs/decisions/005-package-boundary-discipline.md`, `docs/decisions/007-shared-richtext-package.md`, `docs/decisions/008-schema-package.md`, `docs/decisions/009-shared-model-package.md`, `docs/decisions/011-nuxt-module-depends-on-vue.md`, and `docs/decisions/013-live-preview-package.md`.

5. **Upstream check.** When changing `@localess/client`'s public API (adding/removing/renaming methods or types), check whether `@localess/react`, `@localess/angular`, and `@localess/cli` consume the changed surface and update them.

6. **SKILL.md sync.** When changing a package's public API, options, or behavior, update the corresponding `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

7. **Internal-reference-only imports.** Within a package's `src/`, only three roles may import from `@localess/client` directly — a **models** module (every client type the package needs, plus `LocalessApiError`), a **utils** module (every plain client function the package needs — not `localessClient`), and a **client** file (the one place that calls `localessClient(...)` and wraps it in the framework's idiom — a singleton in `core/client.ts` for svelte/vue/react, an injectable `services/client.service.ts` for angular, top-level `client.ts` for cli). Every other internal file — including the public entry point (`index.ts` / `public-api.ts`) — imports through those three instead (e.g. `from '../models'`, `from '../utils'`, `from '../core/client'`, never `from '@localess/client'`). This keeps the client-package boundary at a small, fixed set of files per package, so it can be audited or changed in one place. A package's public entry point may itself be a sanctioned exception when it deliberately re-exports client surface to consumers (e.g. `@localess/angular`'s `public-api.ts` re-exporting all of `@localess/client`, `@localess/react`'s `src/ssr/index.ts` re-exporting `localessClient` for standalone build scripts) — that's a documented pass-through, not a bypass. Currently enforced in `@localess/svelte`, `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/cli`, and `@localess/astro`; each package's `CONTRIBUTING.md` names its exact sanctioned files. `@localess/astro` additionally has a guard test (`src/import-boundary.test.ts`) that fails if a new direct import appears, or if model types are imported via the client's re-export rather than from `@localess/model`; it uses two of the three roles, having no `localessClient(...)` call in TypeScript source. The same discipline applies to `@localess/richtext` imports: each framework package imports it only from its designated richtext file(s) — react `src/core/richtext.ts` (+ a type-only import in `src/core/components/localess-rich-text.tsx`), vue `src/richtext.ts`, svelte `src/lib/components/LocalessRichText.svelte`, astro `src/richtext.ts`, angular `src/pipes/rich-text.pipe.ts` and `src/components/localess-rich-text.component.ts` — with model types re-exported through each package's models barrel.

## Code Style

- TypeScript strict mode with `noImplicitAny: false`. See `tsconfig.json` in each package.
- `@localess/model`, `@localess/client`, `@localess/richtext`, `@localess/schema`, `@localess/react`, `@localess/vue`, `@localess/astro`, `@localess/cli` build with **Vite in library mode** (`vite.config.mts`). Entry point `src/index.ts` → `dist/`. `@localess/svelte` builds with **`svelte-package`** (ESM-only), gated by `svelte-check`.
- `@localess/angular` builds with **ng-packagr via Angular CLI** (`ng-package.json`, `angular.json`). Entry point `src/public-api.ts` → `dist/`. Single unified entry point — no `/browser` or `/server` split.
- Dual CJS + ESM output for JS packages: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types).
- No barrel re-exports except in `index.ts` / `public-api.ts` files.
- Kebab-case file names (e.g. `content-asset.ts`, `use-localess.ts`).
- JSDoc on public API only (exported types, functions, parameters). No inline comments explaining what code does.

## How to Extend Each Package

See each package's CONTRIBUTING.md for step-by-step patterns:

- `packages/client/CONTRIBUTING.md` — adding API methods, models, types
- `packages/schema/CONTRIBUTING.md` — adding field kinds, extending inference/validation
- `packages/react/CONTRIBUTING.md` — adding components, hooks, utilities
- `packages/angular/CONTRIBUTING.md` — adding components, directives, pipes
- `packages/cli/CONTRIBUTING.md` — adding commands and subcommands

## Deeper Context

- `docs/` — full project reference (index, client, model, schema, react, angular, cli, decisions)
- `docs/decisions/` — architectural decision records explaining WHY hard constraints exist
