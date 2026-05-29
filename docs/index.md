# Localess JS SDK — Project Reference

This monorepo contains the official JavaScript/TypeScript SDKs for the Localess headless CMS.

## Packages

| Package | Purpose | Depends on |
|---|---|---|
| `@localess/client` | Core server-side SDK, zero production dependencies | — |
| `@localess/react` | React integration: components, hooks, Visual Editor sync | `@localess/client` |
| `@localess/cli` | CLI for translations and type generation | `@localess/client` |

`@localess/react` and `@localess/cli` never depend on each other.

**Requirements:** Node.js >= 20.0.0, npm >= 10.

## Hard Rules — Never Violate

1. **`@localess/client` is server-side only.** It requires an API token that must stay secret. Never import it in browser bundles, React Client Components, or any client-side code. → [ADR 001](decisions/001-server-side-only.md)

2. **`@localess/client` has zero production dependencies.** Never add to `dependencies` in `packages/client/package.json`. `devDependencies` are fine. → [ADR 002](decisions/002-zero-production-deps.md)

3. **Package boundaries.** `@localess/react` and `@localess/cli` both depend on `@localess/client`. They never depend on each other. → [ADR 005](decisions/005-package-boundary-discipline.md)

4. **Upstream check.** When changing `@localess/client`'s public API (add/remove/rename methods or types), check whether `@localess/react` and `@localess/cli` consume the changed surface and update them.

5. **SKILL.md sync.** When changing a package's public API, options, or behavior, update `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

## Build & Test

```bash
# Build all packages in dependency order
npm run build

# Build individual packages
npm run build:client
npm run build:react
npm run build:cli

# Tests — CLI package only (client and react have no tests)
npm test --workspace=@localess/cli
npx vitest run packages/cli/src/commands/login/login.test.ts  # single file
```

All packages build with **Vite in library mode** (`vite.config.ts` in each package). Output per package:
- `@localess/client` and `@localess/react`: CJS (`dist/index.js`) + ESM (`dist/index.mjs`) + types (`dist/index.d.ts`)
- `@localess/cli`: ESM only (`dist/index.mjs`) — binary with shebang

Tests use **vitest**. Only `@localess/cli` has tests.

## Code Style

- TypeScript strict mode with `noImplicitAny: false`
- Kebab-case file names (`content-asset.ts`, `use-localess.ts`)
- JSDoc on public API only (exported types, functions, parameters)
- No inline comments explaining what code does
- No barrel re-exports except in `index.ts` files
- Dual CJS + ESM output for all packages

## Package Reference

| Document | Contents |
|---|---|
| [docs/client.md](client.md) | `@localess/client` — initialization, API methods, caching, types |
| [docs/react.md](react.md) | `@localess/react` — export variants, components, hooks, sync patterns |
| [docs/cli.md](cli.md) | `@localess/cli` — commands, credentials, CI/CD |
| [docs/decisions/](decisions/) | ADRs — the WHY behind hard constraints |

## Contributor Guide

See `CLAUDE.md` at the repo root for contributor rules, code style, and how to extend each package.
