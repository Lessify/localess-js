# Contributing to @localess/vite

Shared, low-level Vite plugins for Localess's Vite-based integration packages. Framework-agnostic — no Astro, React, Angular, or CLI-specific code belongs here. See `docs/decisions/007-shared-vite-plugin-package.md` for why this package exists.

## Adding a New Virtual-Module Plugin

**1. Create `src/vite-plugin-<name>.ts`:**

```typescript
import type { Plugin } from 'vite';

import { createVirtualModulePlugin } from './create-virtual-module-plugin';

const VIRTUAL_MODULE_ID = 'virtual:localess-<name>';

export function vitePluginLocaless<Name>(/* options */): Plugin {
  return createVirtualModulePlugin('vite-plugin-localess-<name>', VIRTUAL_MODULE_ID, () => `
    // generated module source
  `);
}
```

**2. Export it from `src/index.ts`.**

**3. Write a test in `src/vite-plugin-<name>.test.ts`** covering: the virtual module id resolves to its `\0`-prefixed form, unrelated ids don't resolve, and the generated code contains what you expect (`toContain`, not `toBe`, unless the output must be byte-exact).

**4. Update `packages/vite/SKILL.md`** with the new plugin's signature and usage.

## Hard Constraints

- **No framework-specific code.** No Astro, React, Angular, or CLI imports/types. If a plugin needs framework-specific logic, it belongs in that framework's own package instead.
- **No `dependencies` beyond `@localess/client`.** `vite` stays a `devDependency` only — these plugins are typed against `vite`'s `Plugin` interface but never import `vite`'s runtime code.
- **Never inline secrets.** Anything derived from a value that must stay secret (e.g. an API token) must only be reachable through a virtual module a consumer injects into a server-only script stage — never assume the consumer will get that part right without this package's help.

## Build

```bash
npm run build:vite
# or from packages/vite/
npm run build
```

Output: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types).
