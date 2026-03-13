<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="Localess logo">
<br/>
<br/>

----

# localess-js

Official JavaScript/TypeScript SDK monorepo for the [Localess](https://github.com/Lessify/localess) headless CMS platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

---

## Overview

Localess is a headless CMS designed for teams that need flexible content management with multi-locale support, a Visual Editor, and a developer-friendly API. This repository houses all official JavaScript and TypeScript integrations as a single npm workspaces monorepo.

Keeping all packages together in one repository ensures that shared types and interfaces remain consistent, changes to the core SDK are immediately reflected in framework-specific packages, and versioning stays synchronized across the entire SDK surface.

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@localess/client`](packages/client) | 3.0.0 | Core JavaScript/TypeScript SDK. Fetch content, translations, and assets from the Localess API. **Server-side only.** |
| [`@localess/react`](packages/react) | 3.0.0 | React integration. Dynamic component mapping, rich text rendering, and Visual Editor sync. |
| [`@localess/cli`](packages/cli) | 3.0.0 | Command-line interface. Manage translations and generate TypeScript types from your content schemas. |

### Package Dependency Graph

```
@localess/react ──┐
                  ├──▶ @localess/client (core SDK)
@localess/cli   ──┘
```

`@localess/client` is the foundational layer. Both `@localess/react` and `@localess/cli` depend on it for API communication, caching, and shared type definitions.

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
  token: 'YOUR_API_TOKEN', // Keep secret — server-side only
});

const content = await client.getContentBySlug('home');
const translations = await client.getTranslations('en');
```

→ See the full [`@localess/client` documentation](packages/client/README.md)

---

### React (including Next.js)

```bash
npm install @localess/react
```

```tsx
import { localessInit, getLocalessClient, LocalessComponent } from "@localess/react";

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

### CLI (Translations & Type Generation)

```bash
npm install @localess/cli -D

localess login
localess translations pull en --path ./locales/en.json
localess types generate
```

→ See the full [`@localess/cli` documentation](packages/cli/README.md)

---

## Repository Structure

```
localess-js/
├── packages/
│   ├── client/          # @localess/client
│   ├── react/           # @localess/react
│   └── cli/             # @localess/cli
├── package.json         # Workspace root (npm workspaces)
└── LICENSE
```

---

## Development

### Requirements

- Node.js >= 20.0.0
- npm >= 10 (for workspaces support)

### Install Dependencies

```bash
npm install
```

### Build All Packages

```bash
# Build all packages in dependency order
npm run build

# Build individual packages
npm run build:client
npm run build:react
npm run build:cli
```

### Run Tests

Tests are currently provided for `@localess/cli`:

```bash
npm test --workspace=@localess/cli
```

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/Lessify/localess-js/issues).

---

## License

[MIT](LICENSE) © [Lessify](https://github.com/Lessify)