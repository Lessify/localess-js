# Localess JS SDK — GitHub Copilot Instructions

This monorepo contains four npm packages for the Localess headless CMS:

- `@localess/client` — server-side-only core SDK, zero production dependencies
- `@localess/react` — React integration, depends on `@localess/client`
- `@localess/angular` — Angular integration, depends on `@localess/client`
- `@localess/cli` — CLI tool, depends on `@localess/client`

`@localess/react`, `@localess/angular`, and `@localess/cli` never depend on each other.

## Hard Rules

**Server-side only.** `@localess/client` requires an API token and must never run in browser/client-side code. Never suggest importing it in browser bundles, React Client Components, Angular browser services, or any front-end code.

**Zero production dependencies in `@localess/client`.** Never add entries to `dependencies` in `packages/client/package.json`.

**Package boundaries.** Never introduce a dependency between `@localess/react`, `@localess/angular`, or `@localess/cli`.

**Upstream check.** When editing `@localess/client`'s public API, check whether `@localess/react`, `@localess/angular`, and `@localess/cli` consume the changed surface and update them.

**SKILL.md sync.** When changing a package's public API, options, or behavior, update `packages/<name>/SKILL.md`.

**`@localess/angular` uses ng-packagr, not Vite.** Build with `npm run build:angular` (Angular CLI + ng-packagr). The `playgrounds/angular-ssr` playground requires this build to run first.

## Code Style

- TypeScript strict mode, kebab-case file names
- `@localess/client`, `@localess/react`, `@localess/cli`: dual CJS + ESM output via **Vite library mode** (`vite.config.ts`)
- `@localess/angular`: ng-packagr via Angular CLI (`ng-package.json`), three entry points: main, `browser/`, `server/`
- No barrel re-exports except in `index.ts` / `public-api.ts` files
- JSDoc on exported API only — no inline comments explaining what code does

## Full Reference

See `docs/index.md` for the complete project reference, or jump directly to:
- `docs/client.md` — `@localess/client` API
- `docs/react.md` — `@localess/react` export variants, components, hooks
- `docs/angular.md` — `@localess/angular` entry points, components, directives, pipes
- `docs/cli.md` — `@localess/cli` commands
