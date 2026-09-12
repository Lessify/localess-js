# Localess JS SDK — Project Reference

This monorepo contains the official JavaScript/TypeScript SDKs for the Localess headless CMS.

## Packages

| Package | Purpose | Depends on |
|---|---|---|
| `@localess/model` | Shared domain-model types, zero dependencies of any kind | — |
| `@localess/richtext` | Framework-neutral rich text model + renderer, zero external dependencies | `@localess/model` |
| `@localess/schema` | Programmatic schema definitions with TypeScript content type inference, zero external dependencies | `@localess/model` |
| `@localess/client` | Core server-side SDK | `@localess/model` |
| `@localess/react` | React integration: components, hooks, rich text, Visual Editor sync | `@localess/client`, `@localess/model`, `@localess/richtext` |
| `@localess/angular` | Angular integration: components, directives, pipes, Visual Editor sync | `@localess/client`, `@localess/model`, `@localess/richtext` |
| `@localess/astro` | Astro integration: native components, Visual Editor sync via reload or in-place live preview, dev toolbar | `@localess/client`, `@localess/model`, `@localess/richtext` |
| `@localess/vue` | Vue integration: plugin, components, composables, Vite plugin, Visual Editor sync | `@localess/client`, `@localess/model`, `@localess/richtext` |
| `@localess/svelte` | Svelte integration: context init, components, action, stores, Visual Editor sync | `@localess/client`, `@localess/model`, `@localess/richtext` |
| `@localess/cli` | CLI for translations, type generation, and schema pull/push | `@localess/client`, `@localess/model`, `@localess/schema` |

`@localess/client`, `@localess/react`, `@localess/angular`, `@localess/astro`, `@localess/vue`, `@localess/svelte`, and `@localess/cli` never depend on each other. `@localess/model` depends on nothing; `@localess/richtext` and `@localess/schema` depend only on `@localess/model`, so the three form a root tier with no dependencies outside it.

**Requirements:** Node.js >= 24.0.0, npm >= 10.

## Hard Rules — Never Violate

1. **`@localess/client` is server-side only, with one exception.** It requires an API token; a *secret* token must never reach browser bundles, React Client Components, Angular browser code, or any client-side code. The exception is Localess's *public* tokens (read-only, published content and translations only), which are safe client-side and are used by `@localess/react`'s client-side `LocalessDocument` fallback for static export, `@localess/angular`'s `provideLocaless` (token type follows the rendering mode), `@localess/vue`, and `@localess/svelte`. `@localess/cli` and `@localess/astro` still treat their token as secret-only. → [ADR 001](decisions/001-server-side-only.md)

2. **`@localess/model` has zero dependencies of any kind; `@localess/client`, `@localess/richtext`, and `@localess/schema` depend on `@localess/model` alone.** `packages/model/package.json` has no `dependencies` key at all. `packages/client/package.json`, `packages/richtext/package.json`, and `packages/schema/package.json` each have exactly one `dependencies` entry, `@localess/model` — never add anything else. All four stay zero-*external*-dependency (no npm package outside this monorepo). `devDependencies` are fine. → [ADR 002](decisions/002-zero-production-deps.md), [ADR 007](decisions/007-shared-richtext-package.md), [ADR 008](decisions/008-schema-package.md), [ADR 009](decisions/009-shared-model-package.md)

3. **Package boundaries.** `@localess/client` depends on `@localess/model`. `@localess/react`, `@localess/angular`, `@localess/astro`, `@localess/vue`, and `@localess/svelte` depend on `@localess/client`, `@localess/model`, and `@localess/richtext`; `@localess/cli` depends on `@localess/client`, `@localess/model`, and `@localess/schema`. They never depend on each other. → [ADR 005](decisions/005-package-boundary-discipline.md), [ADR 007](decisions/007-shared-richtext-package.md), [ADR 008](decisions/008-schema-package.md), [ADR 009](decisions/009-shared-model-package.md)

4. **Upstream check.** When changing `@localess/client`'s public API (add/remove/rename methods or types), check whether `@localess/react`, `@localess/angular`, `@localess/astro`, `@localess/vue`, `@localess/svelte`, and `@localess/cli` consume the changed surface and update them.

5. **SKILL.md sync.** When changing a package's public API, options, or behavior, update `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

## Build & Test

```bash
# Build all packages (model, richtext, client, schema, react, vue, svelte, cli, angular, astro)
npm run build

# Build individual packages
npm run build:model     # build before running client/richtext/schema tests
npm run build:richtext   # build before running framework package tests
npm run build:client
npm run build:schema     # build before running @localess/cli tests
npm run build:react
npm run build:vue
npm run build:svelte
npm run build:cli
npm run build:angular
npm run build:astro

# Run Angular / AnalogJS playgrounds
npm run start:angular-ssr
npm run start:angular-static
npm run start:analog
npm run start:analog-static

# Run all package tests
npm test

# Run a single package's tests
npm test --workspace=@localess/angular
npx vitest run packages/cli/src/commands/login/login.test.ts  # single file
```

Build tools per package:
- `@localess/model`, `@localess/client`, `@localess/richtext`, `@localess/schema`, `@localess/react`, `@localess/vue`, `@localess/astro`, `@localess/cli`: **Vite library mode** (`vite.config.mts`) → CJS + ESM + types
- `@localess/svelte`: **`svelte-package`** (ESM-only) for the library surface, gated by a `svelte-check` typecheck step
- `@localess/angular`: **ng-packagr via Angular CLI** (`ng-package.json`, single `entryFile: src/public-api.ts`) → `dist/` with a unified entry (`fesm2022/`, `types/`) — no `/browser` or `/server` split
- `@localess/nuxt`: **`@nuxt/module-builder`** (`build.config.ts`) → `dist/module.mjs` plus an unbundled `dist/runtime/` shipped as-is — Nuxt modules need their own entry format, so Vite library mode does not apply (see ADR 011)

Tests use **vitest** everywhere, including `@localess/angular` (via the Angular CLI's `@angular/build:unit-test` builder with `runner: "vitest"`).

## Code Style

- TypeScript strict mode with `noImplicitAny: false`
- Kebab-case file names (`content-asset.ts`, `use-localess.ts`)
- JSDoc on public API only (exported types, functions, parameters)
- No inline comments explaining what code does
- No barrel re-exports except in `index.ts` / `public-api.ts` files

## Package Reference

| Document | Contents |
|---|---|
| [docs/client.md](client.md) | `@localess/client` — initialization, API methods, caching, types |
| [docs/model.md](model.md) | `@localess/model` — shared domain-model types |
| [docs/richtext.md](richtext.md) | `@localess/richtext` — model, HTML renderer, overrides, fixtures, per-framework usage |
| [docs/live-preview.md](live-preview.md) | `@localess/live-preview` — Visual Editor bridge, sync controller, editable attributes |
| [docs/schema.md](schema.md) | `@localess/schema` — defineSchema/defineEnum/defineField/defineConfig, type inference, validate, export |
| [docs/react.md](react.md) | `@localess/react` — export variants, components, hooks, Vite plugin, sync patterns |
| [docs/angular.md](angular.md) | `@localess/angular` — providers, components, directives, pipes, services, sync |
| [docs/vue.md](vue.md) | `@localess/vue` — plugin, components, composables, Vite plugin, SSR |
| [docs/nuxt.md](nuxt.md) | `@localess/nuxt` — module setup, token split, component auto-registration, server client |
| [docs/svelte.md](svelte.md) | `@localess/svelte` — context init, components, action, stores, SSR |
| [docs/astro.md](astro.md) | `@localess/astro` — integration, components, live preview |
| [docs/cli.md](cli.md) | `@localess/cli` — commands (`translation`, `type`, `schema`), credentials, CI/CD |
| [docs/decisions/](decisions/) | ADRs — the WHY behind hard constraints |

## Contributor Guide

See `CLAUDE.md` at the repo root for contributor rules, code style, and how to extend each package.
