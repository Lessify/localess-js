# Localess JS SDK — Contributor Guide

This is a monorepo containing the official JavaScript/TypeScript SDKs for the Localess headless CMS. Three packages:

- `@localess/client` — Core server-side-only SDK. Zero production dependencies.
- `@localess/react` — React integration (components, hooks, Visual Editor sync). Depends on `@localess/client`.
- `@localess/cli` — CLI for translations and type generation. Depends on `@localess/client`.

Dependency graph: `@localess/client` ← `@localess/react` and `@localess/cli`. The two dependents never depend on each other.

## Quick Reference

```bash
# Build all packages in dependency order
npm run build

# Build individual packages
npm run build:client
npm run build:react
npm run build:cli

# Run tests (CLI package only — client and react have no tests)
npm test --workspace=@localess/cli

# Run a single test file
npx vitest run packages/cli/src/commands/login/login.test.ts
```

Requirements: Node.js >= 20.0.0, npm >= 10.

## Contributor Rules — Never Violate

1. **Never commit.** Never run `git commit` or any command that creates a commit. Make file changes and stop — the developer reviews all changes and commits themselves when ready.

2. **`@localess/client` is server-side only.** Never suggest using it in browser/client-side code. The API token must remain secret. See `docs/decisions/001-server-side-only.md`.

3. **`@localess/client` has zero production dependencies.** Never add entries to `dependencies` in `packages/client/package.json`. `devDependencies` are fine. See `docs/decisions/002-zero-production-deps.md`.

4. **Package boundaries.** `@localess/react` and `@localess/cli` depend on `@localess/client`. They never depend on each other. See `docs/decisions/005-package-boundary-discipline.md`.

5. **Upstream check.** When changing `@localess/client`'s public API (adding/removing/renaming methods or types), check whether `@localess/react` and `@localess/cli` consume the changed surface and update them.

6. **SKILL.md sync.** When changing a package's public API, options, or behavior, update the corresponding `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

## Code Style

- TypeScript strict mode with `noImplicitAny: false`. See `tsconfig.json` in each package.
- All packages build with **Vite in library mode** (`vite.config.ts` in each package). Entry point is always `src/index.ts` → `dist/`.
- Dual CJS + ESM output: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types).
- No barrel re-exports except in `index.ts` files.
- Kebab-case file names (e.g. `content-asset.ts`, `use-localess.ts`).
- JSDoc on public API only (exported types, functions, parameters). No inline comments explaining what code does.

## How to Extend Each Package

See each package's CONTRIBUTING.md for step-by-step patterns:

- `packages/client/CONTRIBUTING.md` — adding API methods, models, types
- `packages/react/CONTRIBUTING.md` — adding components, hooks, utilities
- `packages/cli/CONTRIBUTING.md` — adding commands and subcommands

## Deeper Context

- `@AGENTS.md` — full consumer-facing API reference (read to understand the public API surface)
- `docs/decisions/` — architectural decision records explaining WHY hard constraints exist
