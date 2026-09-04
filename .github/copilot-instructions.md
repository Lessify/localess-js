# Localess JS SDK — GitHub Copilot Instructions

This monorepo contains ten npm packages for the Localess headless CMS, all released in lockstep (one shared version number):

- `@localess/model` — shared domain-model types; zero dependencies of any kind (root package)
- `@localess/client` — server-side core SDK; depends only on `@localess/model`
- `@localess/richtext` — framework-neutral rich text model + HTML renderer; depends only on `@localess/model`
- `@localess/schema` — schema-as-code (`defineSchema`/`defineEnum`/`defineField`/`defineConfig`) with TypeScript content-type inference; depends only on `@localess/model`
- `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro` — framework integrations; each depends on `@localess/client`, `@localess/model`, and `@localess/richtext`
- `@localess/cli` — CLI for translations, type generation, and schema pull/push/diff/validate; depends on `@localess/client`, `@localess/model`, and `@localess/schema`

Dependent packages never depend on each other. Root packages (`model`, `richtext`, `schema`) depend on nothing outside the monorepo.

## Hard Rules

**Never commit.** Make file changes and stop — the developer reviews and commits.

**Server-side only, with one exception.** `@localess/client` requires an API token. A *secret* token must never run in browser/client-side code (browser bundles, React Client Components, Angular browser code). The exception is Localess's *public* read-only tokens, which are safe client-side and used by `@localess/react` (client-side `LocalessDocument` fallback for static export), `@localess/angular` (`provideLocaless`, token type follows the rendering mode), `@localess/vue`, and `@localess/svelte`. `@localess/cli` and `@localess/astro` treat their token as secret-only.

**Zero external production dependencies.** `packages/model/package.json` has no `dependencies` key at all. `packages/client/package.json`, `packages/richtext/package.json`, and `packages/schema/package.json` each list exactly one dependency, `@localess/model`. Never add anything else. `devDependencies` are fine.

**Package boundaries.** Never introduce a dependency between `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro`, or `@localess/cli`. Root packages never depend on anything.

**Upstream check.** When editing `@localess/client`'s public API, check whether the framework packages and `@localess/cli` consume the changed surface and update them.

**SKILL.md sync.** When changing a package's public API, options, or behavior, update `packages/<name>/SKILL.md`. These files ship inside the npm packages for downstream AI agents.

**Internal-reference-only imports.** Inside a framework or CLI package's `src/`, only three files may import from `@localess/client`: a models module, a utils module, and the one client file that calls `localessClient(...)`. Everything else imports through those. `@localess/richtext` is likewise imported only from each package's designated richtext file. See each package's `CONTRIBUTING.md`. `@localess/astro` is not yet converted.

**`@localess/angular` uses ng-packagr, not Vite.** Build with `npm run build:angular` (Angular CLI + ng-packagr). `playgrounds/angular-ssr` requires this build first. **`@localess/svelte` uses `svelte-package`** (ESM-only), gated by `svelte-check`.

## Build & Test

```bash
npm run build          # all packages in dependency order
npm run build:model    # needed before client/richtext/schema tests
npm run build:richtext # needed before framework package tests
npm run build:schema   # needed before @localess/cli tests
npm test               # vitest everywhere (angular via Angular CLI's unit-test builder)
npm test --workspace=@localess/angular
```

Requirements: Node.js >= 24.0.0, npm >= 10.

## Code Style

- TypeScript strict mode (`noImplicitAny: false`), kebab-case file names
- `@localess/model`, `@localess/client`, `@localess/richtext`, `@localess/schema`, `@localess/react`, `@localess/vue`, `@localess/astro`, `@localess/cli`: dual CJS + ESM output via **Vite library mode** (`vite.config.mts`)
- `@localess/angular`: ng-packagr via Angular CLI (`ng-package.json`), single entry point `src/public-api.ts` — no `/browser` or `/server` split
- No barrel re-exports except in `index.ts` / `public-api.ts` files
- JSDoc on exported API only — no inline comments explaining what code does

## Full Reference

See `docs/index.md` for the complete project reference, or jump directly to:
- `docs/model.md` — `@localess/model` shared types
- `docs/client.md` — `@localess/client` API
- `docs/richtext.md` — `@localess/richtext` model, renderer, overrides
- `docs/schema.md` — `@localess/schema` define/infer/validate/export
- `docs/react.md` — `@localess/react` export variants, components, hooks
- `docs/angular.md` — `@localess/angular` providers, components, directives, pipes
- `docs/vue.md` — `@localess/vue` plugin, components, composables
- `docs/svelte.md` — `@localess/svelte` context init, components, action
- `docs/astro.md` — `@localess/astro` integration, components, live preview
- `docs/cli.md` — `@localess/cli` commands
- `docs/decisions/` — ADRs explaining the hard rules
