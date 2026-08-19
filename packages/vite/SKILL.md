# SKILL: @localess/vite

## Overview

`@localess/vite` provides shared, low-level Vite plugins used by Localess's Vite-based integration packages (currently `@localess/astro`). It is not typically installed directly — install the integration package for your framework, which already depends on this one.

---

## Why this exists

A pre-built integration package (one that ships compiled `dist/` output rather than source) can't safely resolve consumer-specific config — like a secret API token, or a space id — via `import.meta.env` or a plain object literal. Those get inlined at *this package's* build time, not the consumer's. Both plugins here build a Vite virtual module instead, deferring resolution to the consumer's own Vite build. See `docs/decisions/007-shared-vite-plugin-package.md` in the `localess-js` repo for the full rationale.

---

## API

### `vitePluginLocalessInit(clientOptions: LocalessClientOptions): Plugin`

Exposes a `virtual:localess-init` module constructing a server-only `LocalessClient` (via `@localess/client`'s `localessClient()`) from `clientOptions`, assigned to `globalThis.localessClientInstance`.

```typescript
import { vitePluginLocalessInit } from '@localess/vite';

// in your framework integration's Vite plugins array
vitePluginLocalessInit({ origin, spaceId, token, cacheTTL });
```

```typescript
// consumer-facing generated import — inject only into a server-only script stage
import { localessClientInstance } from 'virtual:localess-init';
```

**`token` is a secret.** Only inject code importing `virtual:localess-init` into a script stage that runs server-side only and is never bundled into client-shipped JS.

### `vitePluginLocalessOptions(options: Record<string, unknown>): Plugin`

Exposes a `virtual:localess-options` module whose default export is `options`, JSON-serialized. Same virtual-module trick as `vitePluginLocalessInit`, generalized to any config value that must resolve at the consumer's build time.

```typescript
import { vitePluginLocalessOptions } from '@localess/vite';

vitePluginLocalessOptions({ componentsDir: 'src', spaceId });
```

```typescript
// consumer-facing generated import
import options from 'virtual:localess-options';
```

---

## Exports Reference

```typescript
export { vitePluginLocalessInit }    // Server-only LocalessClient virtual module
export { vitePluginLocalessOptions } // Arbitrary options virtual module
```
