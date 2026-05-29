# Localess JS SDK — GitHub Copilot Instructions

This monorepo contains three npm packages for the Localess headless CMS:

- `@localess/client` — server-side-only core SDK, zero production dependencies
- `@localess/react` — React integration, depends on `@localess/client`
- `@localess/cli` — CLI tool, depends on `@localess/client`

`@localess/react` and `@localess/cli` never depend on each other.

## Hard Rules

**Server-side only.** `@localess/client` requires an API token and must never run in browser/client-side code. Never suggest importing it in browser bundles, React Client Components, or any front-end code.

**Zero production dependencies in `@localess/client`.** Never add entries to `dependencies` in `packages/client/package.json`.

**Package boundaries.** Never introduce a dependency from `@localess/react` to `@localess/cli` or vice versa.

**Upstream check.** When editing `@localess/client`'s public API, check whether `@localess/react` and `@localess/cli` consume the changed surface and update them.

**SKILL.md sync.** When changing a package's public API, options, or behavior, update `packages/<name>/SKILL.md`.

## Code Style

- TypeScript strict mode, kebab-case file names, dual CJS + ESM output via **Vite library mode** (`vite.config.ts` in each package)
- No barrel re-exports except in `index.ts` files
- JSDoc on exported API only — no inline comments explaining what code does

## Full Reference

See `docs/index.md` for the complete project reference, or jump directly to:
- `docs/client.md` — `@localess/client` API
- `docs/react.md` — `@localess/react` export variants, components, hooks
- `docs/cli.md` — `@localess/cli` commands
