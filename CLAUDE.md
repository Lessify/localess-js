# Localess JS SDK — Contributor Guide

@AGENTS.md

This is a monorepo containing the official JavaScript/TypeScript SDKs for the Localess headless CMS. Ten packages:

- `@localess/model` — Shared domain-model types (Content, ContentAsset, ContentLink, ContentReference, ContentRichText, Locale, Space, Translations, and related shapes). Zero dependencies.
- `@localess/client` — Core server-side-only SDK. Zero external dependencies (depends on `@localess/model`).
- `@localess/richtext` — Framework-neutral rich text model and renderer. Zero dependencies (not even `@localess/client`) beyond `@localess/model`.
- `@localess/schema` — Programmatic schema definitions with TypeScript content type inference. Zero dependencies (not even `@localess/client`) beyond `@localess/model`.
- `@localess/react` — React integration (components, hooks, rich text, Visual Editor sync).
- `@localess/angular` — Angular integration (components, directives, pipes, Visual Editor sync).
- `@localess/vue` — Vue integration (components, composables, Vite plugin).
- `@localess/svelte` — Svelte integration (components, actions, context).
- `@localess/astro` — Astro integration (integration, components, live preview).
- `@localess/cli` — CLI for translations, type generation, and schema pull/push. Depends on `@localess/client`, `@localess/model`, and `@localess/schema`.

Dependency graph: three roots, `@localess/model`, `@localess/richtext`, and `@localess/schema`, which depend on nothing (see ADR 007, ADR 008, ADR 009). `@localess/client` depends on `@localess/model`. `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, and `@localess/astro` depend on `@localess/client`, `@localess/model`, and `@localess/richtext`; `@localess/cli` depends on `@localess/client`, `@localess/model`, and `@localess/schema`. Dependent packages never depend on each other.

## Quick Reference

```bash
# Build all packages (model, richtext, client, schema, react, vue, svelte, cli, angular, astro)
npm run build

# Build individual packages
npm run build:model     # must be built before running client/richtext/schema tests
npm run build:richtext   # must be built before running framework package tests
npm run build:client
npm run build:schema     # must be built before running @localess/cli tests
npm run build:react
npm run build:vue
npm run build:svelte
npm run build:cli
npm run build:angular
npm run build:astro

# Run angular-ssr playground (requires build:angular first)
npm run start:angular-ssr

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

2. **`@localess/client` is server-side only, with one exception.** Never suggest using it in browser/client-side code, and a secret token must never be exposed client-side. The one exception: Localess now also issues **public tokens** (read-only, published content and translations only) that are safe to use client-side — currently supported in `@localess/react` (its `LocalessClientDocument` client-side registration path) and `@localess/angular` (its unified `provideLocaless({ token, ... })`, where the token's type is determined by the app's rendering mode). `@localess/cli` and `@localess/astro` have not been reworked for this yet — treat their token as secret-only until they are. See `docs/decisions/001-server-side-only.md`.

3. **`@localess/model`, `@localess/richtext`, and `@localess/schema` have zero dependencies of any kind.** `@localess/client` has zero *external* dependencies but depends on `@localess/model` internally — never add anything else to `dependencies` in `packages/client/package.json`. `packages/model/package.json`, `packages/richtext/package.json`, and `packages/schema/package.json` have no `dependencies` key at all and must stay that way. `devDependencies` are fine (e.g. TipTap in richtext, used only by its parity test). See `docs/decisions/002-zero-production-deps.md`, `docs/decisions/007-shared-richtext-package.md`, `docs/decisions/008-schema-package.md`, and `docs/decisions/009-shared-model-package.md`.

4. **Package boundaries.** `@localess/client` depends on `@localess/model`. `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, and `@localess/astro` depend on `@localess/client`, `@localess/model`, and `@localess/richtext`; `@localess/cli` depends on `@localess/client`, `@localess/model`, and `@localess/schema`. Dependent packages never depend on each other, and root packages never depend on anything. See `docs/decisions/005-package-boundary-discipline.md`, `docs/decisions/007-shared-richtext-package.md`, `docs/decisions/008-schema-package.md`, and `docs/decisions/009-shared-model-package.md`.

5. **Upstream check.** When changing `@localess/client`'s public API (adding/removing/renaming methods or types), check whether `@localess/react`, `@localess/angular`, and `@localess/cli` consume the changed surface and update them.

6. **SKILL.md sync.** When changing a package's public API, options, or behavior, update the corresponding `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

7. **Internal-reference-only imports.** Within a package's `src/`, only three roles may import from `@localess/client` directly — a **models** module (every client type the package needs, plus `LocalessApiError`), a **utils** module (every plain client function the package needs — not `localessClient`), and a **client** file (the one place that calls `localessClient(...)` and wraps it in the framework's idiom — a singleton in `core/client.ts` for svelte/vue/react, an injectable `services/client.service.ts` for angular, top-level `client.ts` for cli). Every other internal file — including the public entry point (`index.ts` / `public-api.ts`) — imports through those three instead (e.g. `from '../models'`, `from '../utils'`, `from '../core/client'`, never `from '@localess/client'`). This keeps the client-package boundary at a small, fixed set of files per package, so it can be audited or changed in one place. A package's public entry point may itself be a sanctioned exception when it deliberately re-exports client surface to consumers (e.g. `@localess/angular`'s `public-api.ts` re-exporting all of `@localess/client`, `@localess/react`'s `src/ssr/index.ts` re-exporting `localessClient` for standalone build scripts) — that's a documented pass-through, not a bypass. Currently enforced in `@localess/svelte`, `@localess/react`, `@localess/angular`, `@localess/vue`, and `@localess/cli`; each package's `CONTRIBUTING.md` names its exact three files. `@localess/astro` still needs this convention applied — bring it into compliance when next touching its client imports, rather than as a standalone sweep. The same discipline applies to `@localess/richtext` imports: each framework package imports it only from its designated richtext file(s) — react `src/core/richtext.ts` (+ a type-only import in `src/core/components/localess-rich-text.tsx`), vue `src/richtext.ts`, svelte `src/lib/components/LocalessRichText.svelte`, astro `src/richtext.ts`, angular `src/pipes/rich-text.pipe.ts` and `src/components/localess-rich-text.component.ts` — with model types re-exported through each package's models barrel.

## Code Style

- TypeScript strict mode with `noImplicitAny: false`. See `tsconfig.json` in each package.
- `@localess/model`, `@localess/client`, `@localess/schema`, `@localess/react`, `@localess/cli` build with **Vite in library mode** (`vite.config.ts`). Entry point `src/index.ts` → `dist/`.
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
