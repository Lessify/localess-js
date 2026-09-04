# Localess JavaScript/TypeScript SDK

This file is a redirect stub. The authoritative project reference has moved to `docs/`.

## Package Reference

| Document | Contents |
|---|---|
| [docs/index.md](docs/index.md) | Overview, hard rules, build & test, code style |
| [docs/model.md](docs/model.md) | `@localess/model` — shared domain-model types |
| [docs/client.md](docs/client.md) | `@localess/client` — initialization, API methods, caching, types |
| [docs/richtext.md](docs/richtext.md) | `@localess/richtext` — model, HTML renderer, overrides, fixtures, per-framework usage |
| [docs/schema.md](docs/schema.md) | `@localess/schema` — defineSchema/defineEnum/defineField/defineConfig, type inference, validate, export |
| [docs/react.md](docs/react.md) | `@localess/react` — export variants, components, hooks, sync patterns |
| [docs/angular.md](docs/angular.md) | `@localess/angular` — providers, components, directives, pipes, services, sync |
| [docs/vue.md](docs/vue.md) | `@localess/vue` — plugin, components, composables, Vite plugin, SSR |
| [docs/svelte.md](docs/svelte.md) | `@localess/svelte` — context init, components, action, stores, SSR |
| [docs/astro.md](docs/astro.md) | `@localess/astro` — integration, components, live preview |
| [docs/cli.md](docs/cli.md) | `@localess/cli` — commands, credentials, CI/CD |
| [docs/decisions/](docs/decisions/) | ADRs — the WHY behind hard constraints |

Each package also ships a `SKILL.md` (`packages/<name>/SKILL.md`) with its public API for downstream AI agents, and a `CONTRIBUTING.md` with extension patterns. Contributor rules live in `CLAUDE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
