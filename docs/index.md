# Localess JS SDK — Project Reference

This monorepo contains the official JavaScript/TypeScript SDKs for the Localess headless CMS.

## Packages

| Package | Purpose | Depends on |
|---|---|---|
| `@localess/client` | Core server-side SDK, zero production dependencies | — |
| `@localess/richtext` | Framework-neutral rich text model + renderer, zero dependencies | — |
| `@localess/schema` | Programmatic schema definitions with TypeScript content type inference, zero dependencies | — |
| `@localess/react` | React integration: components, hooks, rich text, Visual Editor sync | `@localess/client`, `@localess/richtext` |
| `@localess/angular` | Angular integration: components, directives, pipes, Visual Editor sync | `@localess/client`, `@localess/richtext` |
| `@localess/astro` | Astro integration: native components, Visual Editor sync via reload | `@localess/client`, `@localess/richtext` |
| `@localess/vue` | Vue integration: plugin, component, directive, composables, Visual Editor sync | `@localess/client`, `@localess/richtext` |
| `@localess/svelte` | Svelte integration: context init, component, action, Visual Editor sync | `@localess/client`, `@localess/richtext` |
| `@localess/cli` | CLI for translations, type generation, and schema pull/push | `@localess/client`, `@localess/schema` |

`@localess/react`, `@localess/angular`, `@localess/astro`, `@localess/vue`, `@localess/svelte`, and `@localess/cli` never depend on each other; `@localess/client`, `@localess/richtext`, and `@localess/schema` depend on nothing.

**Requirements:** Node.js >= 24.0.0, npm >= 10.

## Hard Rules — Never Violate

1. **`@localess/client` is server-side only.** It requires an API token that must stay secret. Never import it in browser bundles, React Client Components, Angular browser code, or any client-side code. → [ADR 001](decisions/001-server-side-only.md)

2. **`@localess/client`, `@localess/richtext`, and `@localess/schema` have zero production dependencies.** Never add to `dependencies` in `packages/client/package.json`; `packages/richtext/package.json` and `packages/schema/package.json` have no `dependencies` key at all. `devDependencies` are fine. → [ADR 002](decisions/002-zero-production-deps.md), [ADR 007](decisions/007-shared-richtext-package.md), [ADR 008](decisions/008-schema-package.md)

3. **Package boundaries.** `@localess/react`, `@localess/angular`, `@localess/astro`, `@localess/vue`, and `@localess/svelte` depend on `@localess/client` and `@localess/richtext`; `@localess/cli` depends on `@localess/client` and `@localess/schema`. They never depend on each other. → [ADR 005](decisions/005-package-boundary-discipline.md), [ADR 007](decisions/007-shared-richtext-package.md), [ADR 008](decisions/008-schema-package.md)

4. **Upstream check.** When changing `@localess/client`'s public API (add/remove/rename methods or types), check whether `@localess/react`, `@localess/angular`, `@localess/astro`, `@localess/vue`, `@localess/svelte`, and `@localess/cli` consume the changed surface and update them.

5. **SKILL.md sync.** When changing a package's public API, options, or behavior, update `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

## Build & Test

```bash
# Build all packages (richtext, client, schema, react, vue, svelte, cli, angular, astro)
npm run build

# Build individual packages
npm run build:richtext   # build before running framework package tests
npm run build:client
npm run build:schema     # build before running @localess/cli tests
npm run build:react
npm run build:vue
npm run build:svelte
npm run build:cli
npm run build:angular
npm run build:astro

# Run angular-ssr playground
npm run start:angular-ssr

# Run all package tests
npm test

# Run a single package's tests
npm test --workspace=@localess/angular
npx vitest run packages/cli/src/commands/login/login.test.ts  # single file
```

Build tools per package:
- `@localess/client`, `@localess/richtext`, `@localess/schema`, `@localess/react`, `@localess/vue`, `@localess/cli`: **Vite library mode** (`vite.config.ts`) → CJS + ESM + types
- `@localess/svelte`: **`svelte-package`** (ESM-only) for the library surface, gated by a `svelte-check` typecheck step
- `@localess/angular`: **ng-packagr via Angular CLI** (`ng-package.json`) → `dist/` with main, `browser/`, `server/` sub-entries

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
| [docs/richtext.md](richtext.md) | `@localess/richtext` — model, HTML renderer, overrides, fixtures, per-framework usage |
| [docs/schema.md](schema.md) | `@localess/schema` — defineSchema/defineEnum/defineConfig, type inference, validate, export |
| [docs/react.md](react.md) | `@localess/react` — export variants, components, hooks, sync patterns |
| [docs/angular.md](angular.md) | `@localess/angular` — entry points, components, directives, pipes, sync |
| [docs/vue.md](vue.md) | `@localess/vue` — plugin, component, directive, composables, Vite plugin, SSR |
| [docs/svelte.md](svelte.md) | `@localess/svelte` — context init, component, action, stores, SSR |
| [docs/cli.md](cli.md) | `@localess/cli` — commands, credentials, CI/CD |
| [docs/decisions/](decisions/) | ADRs — the WHY behind hard constraints |

## Contributor Guide

See `CLAUDE.md` at the repo root for contributor rules, code style, and how to extend each package.
