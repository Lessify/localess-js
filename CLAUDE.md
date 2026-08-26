# Localess JS SDK — Contributor Guide

@AGENTS.md

This is a monorepo containing the official JavaScript/TypeScript SDKs for the Localess headless CMS. Four packages:

- `@localess/client` — Core server-side-only SDK. Zero production dependencies.
- `@localess/react` — React integration (components, hooks, Visual Editor sync). Depends on `@localess/client`.
- `@localess/angular` — Angular integration (components, directives, pipes, Visual Editor sync). Depends on `@localess/client`.
- `@localess/cli` — CLI for translations and type generation. Depends on `@localess/client`.

Dependency graph: `@localess/client` ← `@localess/react`, `@localess/angular`, and `@localess/cli`. The three dependents never depend on each other.

## Quick Reference

```bash
# Build all packages (client, react, cli, angular)
npm run build

# Build individual packages
npm run build:client
npm run build:react
npm run build:cli
npm run build:angular

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

3. **`@localess/client` has zero production dependencies.** Never add entries to `dependencies` in `packages/client/package.json`. `devDependencies` are fine. See `docs/decisions/002-zero-production-deps.md`.

4. **Package boundaries.** `@localess/react`, `@localess/angular`, and `@localess/cli` depend on `@localess/client`. They never depend on each other. See `docs/decisions/005-package-boundary-discipline.md`.

5. **Upstream check.** When changing `@localess/client`'s public API (adding/removing/renaming methods or types), check whether `@localess/react`, `@localess/angular`, and `@localess/cli` consume the changed surface and update them.

6. **SKILL.md sync.** When changing a package's public API, options, or behavior, update the corresponding `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

7. **Internal-reference-only imports.** Within a package's `src/`, only three roles may import from `@localess/client` directly — a **models** module (every client type the package needs, plus `LocalessApiError`), a **utils** module (every plain client function the package needs — not `localessClient`), and a **client** file (the one place that calls `localessClient(...)` and wraps it in the framework's idiom — a singleton in `core/client.ts` for svelte/vue/react, an injectable `services/client.service.ts` for angular, top-level `client.ts` for cli). Every other internal file — including the public entry point (`index.ts` / `public-api.ts`) — imports through those three instead (e.g. `from '../models'`, `from '../utils'`, `from '../core/client'`, never `from '@localess/client'`). This keeps the client-package boundary at a small, fixed set of files per package, so it can be audited or changed in one place. A package's public entry point may itself be a sanctioned exception when it deliberately re-exports client surface to consumers (e.g. `@localess/angular`'s `public-api.ts` re-exporting all of `@localess/client`, `@localess/react`'s `src/ssr/index.ts` re-exporting `localessClient` for standalone build scripts) — that's a documented pass-through, not a bypass. Currently enforced in `@localess/svelte`, `@localess/react`, `@localess/angular`, `@localess/vue`, and `@localess/cli`; each package's `CONTRIBUTING.md` names its exact three files. `@localess/astro` still needs this convention applied — bring it into compliance when next touching its client imports, rather than as a standalone sweep. `@localess/cli` also has one known pre-existing gap (`src/models/space.ts` imports `Locale` directly) noted in its `CONTRIBUTING.md`.

## Code Style

- TypeScript strict mode with `noImplicitAny: false`. See `tsconfig.json` in each package.
- `@localess/client`, `@localess/react`, `@localess/cli` build with **Vite in library mode** (`vite.config.ts`). Entry point `src/index.ts` → `dist/`.
- `@localess/angular` builds with **ng-packagr via Angular CLI** (`ng-package.json`, `angular.json`). Entry point `src/public-api.ts` → `dist/`. Single unified entry point — no `/browser` or `/server` split.
- Dual CJS + ESM output for JS packages: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types).
- No barrel re-exports except in `index.ts` / `public-api.ts` files.
- Kebab-case file names (e.g. `content-asset.ts`, `use-localess.ts`).
- JSDoc on public API only (exported types, functions, parameters). No inline comments explaining what code does.

## How to Extend Each Package

See each package's CONTRIBUTING.md for step-by-step patterns:

- `packages/client/CONTRIBUTING.md` — adding API methods, models, types
- `packages/react/CONTRIBUTING.md` — adding components, hooks, utilities
- `packages/angular/CONTRIBUTING.md` — adding components, directives, pipes
- `packages/cli/CONTRIBUTING.md` — adding commands and subcommands

## Deeper Context

- `docs/` — full project reference (index, client, react, angular, cli, decisions)
- `docs/decisions/` — architectural decision records explaining WHY hard constraints exist
