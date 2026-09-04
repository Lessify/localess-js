# Contributing to @localess/client

Core SDK. Server-side only (ADR 001 — secret tokens never reach the browser; public-token client-side use is implemented in the framework packages, never by importing this package in the browser). Zero external dependencies (depends only on the shared, itself-zero-dependency `@localess/model` package for data-model types). Node.js >= 24.0.0.

## Module map

| File | Responsibility |
|---|---|
| `src/client.ts` | `localessClient` factory, `LocalessClient` interface, option/param types, `LocalessApiError` / `LocalessNetworkError`, hint computation, boxed console error output |
| `src/cache.ts` | `ICache`, `Cache`, `NoCache`, `TTLCache` |
| `src/editable.ts` | `localessEditable`, `localessEditableField` (Visual Editor `data-ll-*` attributes) |
| `src/sync.ts` | `loadLocalessSync` (Visual Editor sync script injector) |
| `src/models/index.ts` | `export * from '@localess/model'` — the only place model types enter this package |
| `src/utils/` | `buildAssetQueryString`, `findLink`, `isBrowser` / `isServer` / `isIframe` |
| `src/index.ts` | barrel plus the sync event types (`LocalessSync`, `EventToApp`, `EventToAppOf`, `EventToAppType`, `EventCallback`) and the global `Window.localess` declaration |

Every module has a sibling `*.test.ts` (vitest). Build `@localess/model` first (`npm run build:model`) before running this package's tests.

## Adding a New API Method

**1. Add the method signature to the `LocalessClient` interface in `src/client.ts`:**

```typescript
// Example: fetching a list of assets
getAssets(params?: AssetsFetchParams): Promise<Assets>;
```

**2. Define the fetch params type in `src/client.ts` (above the interface):**

```typescript
export type AssetsFetchParams = {
  /**
   * Filter by folder path.
   * @example 'images/heroes'
   */
  folder?: string;
};
```

**3. Implement the method in the `localessClient` factory return object in `src/client.ts`:**

Follow the exact same pattern as existing methods — build the URL, then delegate to the shared `fetchJson<T>(url, methodLabel)` helper (defined once per client instance, above the returned object), which handles the cache check, the fetch, non-2xx/network error handling (as `LocalessApiError`/`LocalessNetworkError`), and storing the result in cache:

```typescript
async getAssets(params?: AssetsFetchParams): Promise<Assets> {
  if (options.debug) {
    console.log(LOG_GROUP, 'getAssets() params : ', JSON.stringify(params));
  }
  const folder = params?.folder ? `&folder=${params.folder}` : '';
  const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/assets?token=${options.token}${folder}`;
  if (options.debug) {
    console.log(LOG_GROUP, 'getAssets fetch url : ', url);
  }
  return fetchJson<Assets>(url, 'getAssets');
},
```

**4. If returning a new type, add it to `@localess/model` instead of this package:**

Data-model types (anything shaping an API response) live in
`packages/model/src/`, not here — see `packages/model/CONTRIBUTING.md` for
how to add one. `packages/client/src/models/index.ts` is just
`export * from '@localess/model';`; it re-exports whatever you add there
automatically. Only add a file directly under `packages/client/src/models/`
for a type that is genuinely client-package-specific and not a shared
domain shape (rare — check with the maintainer before doing this).

**5. Export the new fetch params type from `src/index.ts` if it's part of the public API.**

`src/index.ts` re-exports everything via `export * from './client'` — new types in `client.ts` are automatically public. Models go through `src/models/index.ts` → `src/index.ts`.

**6. Add tests** in `src/client.test.ts` — at minimum the URL the method builds, cache behaviour, and that non-2xx / network failures reject with `LocalessApiError` / `LocalessNetworkError`.

**7. Update the docs** — `packages/client/SKILL.md` (ships in the npm package), `packages/client/README.md`, and `docs/client.md` — with the new method signature and a usage example.

**8. Upstream check.** When adding, removing, or renaming anything on the public surface, check whether `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro`, or `@localess/cli` consume it (each imports the client only through its `models` / `utils` / client files — see their `CONTRIBUTING.md`) and update them.

## Hard Constraints

- **No React imports.** No `react` in any import.
- **No CLI logic.** No `commander`, `inquirer`, or filesystem imports.
- **No `dependencies` beyond `@localess/model`.** Never add anything else to `dependencies` in `package.json`. Use `devDependencies` for build tools only.
- **Server-side only.** Never use `window`, `document`, or browser globals — **except** inside the browser-safe, token-free utility surface (`src/sync.ts`, `src/editable.ts`, `src/utils/platform.util.ts`), which exists specifically to be called from the browser by the framework packages (ADR 001).
- **Never log the token.** Every URL that reaches `console.error` or an error object goes through `redactToken()` first.

## Build

```bash
npm run build:client
# or from packages/client/
npm run build
```

Output: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types). The build inlines `version` from `package.json`, which the client sends as the `X-Localess-Agent-Version` request header.
