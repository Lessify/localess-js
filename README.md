<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="Localess logo">
<br/>
<br/>

----

# localess-js

Official JavaScript/TypeScript SDK monorepo for the [Localess](https://github.com/Lessify/localess) headless CMS platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org)

---

## Overview

Localess is a headless CMS designed for teams that need flexible content management with multi-locale support, a Visual Editor, and a developer-friendly API. This repository houses all official JavaScript and TypeScript integrations as a single npm workspaces monorepo.

Keeping all packages together in one repository ensures that shared types and interfaces remain consistent, changes to the core SDK are immediately reflected in framework-specific packages, and versioning stays synchronized across the entire SDK surface. All packages share one version number (lockstep semver).

---

## Packages

| Package                                   | Version | Description                                                                                                              |
|-------------------------------------------|---------|--------------------------------------------------------------------------------------------------------------------------|
| [`@localess/model`](packages/model)       | 4.0.0   | Shared domain-model types (content, assets, links, references, rich text, locales, spaces, translations, schemas). Zero dependencies. |
| [`@localess/client`](packages/client)     | 4.0.0   | Core JavaScript/TypeScript SDK. Fetch content, translations, and assets from the Localess API. **Server-side only**, unless used with a public token. |
| [`@localess/richtext`](packages/richtext) | 4.0.0   | Framework-neutral rich text model and HTML renderer for Localess's TipTap JSON content. Zero dependencies.               |
| [`@localess/schema`](packages/schema)     | 4.0.0   | Programmatic schema definitions (`defineSchema`, `defineEnum`, `defineField`, `defineConfig`) with TypeScript content type inference. Zero dependencies. |
| [`@localess/react`](packages/react)       | 4.0.0   | React integration (incl. Next.js, React Router, TanStack Start). Dynamic component mapping, rich text, Visual Editor sync. |
| [`@localess/angular`](packages/angular)   | 4.0.0   | Angular integration. Components, directives, pipes, services, and Visual Editor sync.                                     |
| [`@localess/vue`](packages/vue)           | 4.0.0   | Vue 3 integration (incl. Nuxt). Plugin, components, composables, Vite plugin, and Visual Editor sync.                    |
| [`@localess/svelte`](packages/svelte)     | 4.0.0   | Svelte 5 integration (incl. SvelteKit). Context init, components, actions, stores, and Visual Editor sync.               |
| [`@localess/astro`](packages/astro)       | 4.0.0   | Astro integration. Astro Integration entry, native `.astro` components, and Visual Editor live preview.                  |
| [`@localess/cli`](packages/cli)           | 4.0.0   | Command-line interface. Manage translations, generate TypeScript types, and pull/push/diff/validate schemas.             |

### Package Dependency Graph

```
                       ┌──▶ @localess/model
@localess/react   ─────┼──▶ @localess/client ──▶ @localess/model
@localess/angular ─────┤
@localess/vue     ─────┼──▶ @localess/richtext ──▶ @localess/model
@localess/svelte  ─────┤
@localess/astro   ─────┘

                       ┌──▶ @localess/model
@localess/cli     ─────┼──▶ @localess/client ──▶ @localess/model
                       └──▶ @localess/schema ──▶ @localess/model
```

`@localess/model` is the root of the graph and depends on nothing. `@localess/client`, `@localess/richtext`, and `@localess/schema` depend only on `@localess/model`. The framework packages depend on `@localess/client`, `@localess/model`, and `@localess/richtext`; `@localess/cli` depends on `@localess/client`, `@localess/model`, and `@localess/schema`. Dependent packages never depend on each other. See [`docs/decisions/`](docs/decisions/) for the reasoning behind these boundaries.

---

## Quick Start

Choose the package that fits your use case:

### Server-side / Framework-agnostic

```bash
npm install @localess/client
```

```ts
import { localessClient } from "@localess/client";

const client = localessClient({
  origin: 'https://my-localess.web.app',
  spaceId: 'YOUR_SPACE_ID',
  token: 'YOUR_API_TOKEN', // Keep secret — server-side only (public read-only tokens are safe client-side)
});

const content = await client.getContentBySlug('home');
const translations = await client.getTranslations('en');
```

→ See the full [`@localess/client` documentation](packages/client/README.md)

---

### React (including Next.js, React Router, TanStack Start)

```bash
npm install @localess/react
```

```tsx
import { localessInit, LocalessComponent } from "@localess/react";

localessInit({
  origin: process.env.LOCALESS_ORIGIN,
  spaceId: process.env.LOCALESS_SPACE_ID,
  token: process.env.LOCALESS_TOKEN,
  enableSync: true,
  components: { 'hero': HeroBlock, 'footer': Footer },
});
```

→ See the full [`@localess/react` documentation](packages/react/README.md)

---

### Angular

```bash
npm install @localess/angular
```

```ts
import { provideLocaless } from "@localess/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideLocaless({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
      token: 'YOUR_PUBLIC_TOKEN',
      enableSync: true,
    }),
  ],
};
```

→ See the full [`@localess/angular` documentation](packages/angular/README.md)

---

### Vue (including Nuxt)

```bash
npm install @localess/vue
```

```ts
import { createApp } from "vue";
import { Localess } from "@localess/vue";

createApp(App)
  .use(Localess, {
    origin: import.meta.env.VITE_LOCALESS_ORIGIN,
    spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
    token: import.meta.env.VITE_LOCALESS_TOKEN, // public token only
    components: { page: PageComponent, button: ButtonComponent },
    enableSync: true,
  })
  .mount('#app');
```

→ See the full [`@localess/vue` documentation](docs/vue.md)

---

### Svelte (including SvelteKit)

```bash
npm install @localess/svelte
```

```svelte
<script lang="ts">
  import { localessInit } from "@localess/svelte";

  localessInit({
    origin: import.meta.env.VITE_LOCALESS_ORIGIN,
    spaceId: import.meta.env.VITE_LOCALESS_SPACE_ID,
    token: import.meta.env.VITE_LOCALESS_TOKEN, // public token only
    components: { page: Page, button: Button },
    enableSync: true,
  });
</script>
```

→ See the full [`@localess/svelte` documentation](docs/svelte.md)

---

### Astro

```bash
npm install @localess/astro
```

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { localess } from "@localess/astro";

export default defineConfig({
  integrations: [
    localess({
      origin: process.env.LOCALESS_ORIGIN,
      spaceId: process.env.LOCALESS_SPACE_ID,
      token: process.env.LOCALESS_TOKEN,
      enableSync: true,
    }),
  ],
});
```

→ See the full [`@localess/astro` documentation](docs/astro.md)

---

### Schema as code

```bash
npm install @localess/schema
```

```ts
import { defineConfig, defineEnum, defineSchema, type InferContentData } from "@localess/schema";

const Size = defineEnum({
  id: 'Size',
  displayName: 'Size',
  values: [{ name: 'Small', value: 'small' }, { name: 'Large', value: 'large' }],
});

const Page = defineSchema({
  id: 'Page',
  type: 'ROOT',
  displayName: 'Page',
  fields: [
    { name: 'title', kind: 'TEXT', required: true },
    { name: 'size', kind: 'OPTION', source: Size }, // by-value ref, normalized to 'Size'
  ],
});

export const config = defineConfig({ schemas: [Size, Page] });
export type Content = InferContentData<typeof config>;
```

→ See the full [`@localess/schema` documentation](docs/schema.md)

---

### CLI (Translations, Type Generation & Schemas)

```bash
npm install @localess/cli -D

localess login
localess translation pull en --path ./locales/en.json
localess type generate
localess schema validate ./localess.config.ts
```

→ See the full [`@localess/cli` documentation](packages/cli/README.md)

---

## Repository Structure

```
localess-js/
├── packages/
│   ├── model/           # @localess/model
│   ├── client/          # @localess/client
│   ├── richtext/        # @localess/richtext
│   ├── schema/          # @localess/schema
│   ├── react/           # @localess/react
│   ├── angular/         # @localess/angular
│   ├── vue/             # @localess/vue
│   ├── svelte/          # @localess/svelte
│   ├── astro/           # @localess/astro
│   └── cli/             # @localess/cli
├── playgrounds/         # Example apps per framework (next, react-router, tanstack-start,
│                        # angular-ssr, nuxt, svelte-kit, astro, schema, and their static variants)
├── docs/                # Project reference and architectural decision records (ADRs)
├── package.json         # Workspace root (npm workspaces)
└── LICENSE
```

---

## Development

### Requirements

- Node.js >= 24.0.0
- npm >= 10 (for workspaces support)

### Install Dependencies

```bash
npm install
```

### Build All Packages

```bash
# Build all packages in dependency order
# (model, richtext, client, schema, react, vue, svelte, cli, angular, astro)
npm run build

# Build individual packages
npm run build:model
npm run build:richtext
npm run build:client
npm run build:schema
npm run build:react
npm run build:vue
npm run build:svelte
npm run build:cli
npm run build:angular
npm run build:astro
```

`@localess/model` must be built before running the client, richtext, or schema tests; `@localess/richtext` before the framework package tests; `@localess/schema` before the CLI tests.

### Run Tests

All packages have test suites (vitest everywhere, including `@localess/angular` via Angular CLI's unit-test builder):

```bash
npm test

# Run a single package's tests
npm test --workspace=@localess/angular
npm run test:cli

# Run a single test file
npx vitest run packages/cli/src/commands/login/login.test.ts
```

### Playgrounds

```bash
# Angular SSR playground (requires build:angular first)
npm run start:angular-ssr
```

Other playgrounds under `playgrounds/` are regular npm workspaces — run them with `npm run dev --workspace=<name>`; see each playground's README.

---

## AI Coding Agents

Each package ships a `SKILL.md` file that directs AI coding agents (GitHub Copilot, Claude Code, Cursor, and others) to accurate, up-to-date APIs, patterns, and best practices for that package — instead of relying on potentially outdated training data.

### SKILL files

| Package               | SKILL file                                                    |
|-----------------------|---------------------------------------------------------------|
| `@localess/model`     | [`packages/model/SKILL.md`](packages/model/SKILL.md)         |
| `@localess/client`    | [`packages/client/SKILL.md`](packages/client/SKILL.md)       |
| `@localess/richtext`  | [`packages/richtext/SKILL.md`](packages/richtext/SKILL.md)   |
| `@localess/schema`    | [`packages/schema/SKILL.md`](packages/schema/SKILL.md)       |
| `@localess/react`     | [`packages/react/SKILL.md`](packages/react/SKILL.md)         |
| `@localess/angular`   | [`packages/angular/SKILL.md`](packages/angular/SKILL.md)     |
| `@localess/vue`       | [`packages/vue/SKILL.md`](packages/vue/SKILL.md)             |
| `@localess/svelte`    | [`packages/svelte/SKILL.md`](packages/svelte/SKILL.md)       |
| `@localess/astro`     | [`packages/astro/SKILL.md`](packages/astro/SKILL.md)         |
| `@localess/cli`       | [`packages/cli/SKILL.md`](packages/cli/SKILL.md)             |

### Using SKILL files in your project

`SKILL.md` is shipped inside each npm package, so it is available locally in `node_modules` after installation. Reference it from your project's `AGENTS.md` to ensure your agent reads accurate Localess documentation every session:

```markdown
## Localess

Refer to the following SKILL files for accurate API usage, patterns, and best practices:

- @node_modules/@localess/client/SKILL.md
- @node_modules/@localess/react/SKILL.md
- @node_modules/@localess/schema/SKILL.md
- @node_modules/@localess/cli/SKILL.md
```

Include only the packages your project uses. The `@` prefix is the syntax used by most agent tools (GitHub Copilot, Claude Code, Cursor) to import file contents inline into the agent context.

### Keeping SKILL files up to date

When you make changes to a package's public API, options, behaviour, or best practices, update the corresponding `SKILL.md` alongside your code change:

- **New option or parameter** → add it to the relevant options table and usage example
- **Changed behaviour** → update the description and any affected code snippets
- **Deprecated API** → mark it clearly and point to the replacement
- **New command or subcommand (CLI)** → add a full entry with all flags and examples

---

## Documentation

- [`docs/index.md`](docs/index.md) — project reference: packages, hard rules, build & test, code style
- [`docs/decisions/`](docs/decisions/) — architectural decision records (the WHY behind the hard constraints)
- [`CHANGELOG.md`](CHANGELOG.md) — release notes
- [`CLAUDE.md`](CLAUDE.md) — contributor guide for humans and AI agents working in this repo

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/Lessify/localess-js/issues).

---

## License

[MIT](LICENSE) © [Lessify](https://github.com/Lessify)
