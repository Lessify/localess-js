# Contributing to @localess/client

Core SDK. Server-side only. Zero production dependencies. Node.js >= 20.

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

Follow the exact same pattern as existing methods — build the URL, check the cache, fetch, store in cache, return typed data:

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
  if (cache.has(url)) {
    if (options.debug) {
      console.log(LOG_GROUP, 'getAssets cache hit');
    }
    return cache.get(url) as Assets;
  }
  try {
    const response = await fetch(url, fetchOptions);
    if (options.debug) {
      console.log(LOG_GROUP, 'getAssets status : ', response.status);
    }
    const data = await response.json();
    cache.set(url, data);
    return data as Assets;
  } catch (error) {
    console.error(LOG_GROUP, 'getAssets error : ', error);
    return {} as Assets;
  }
},
```

**4. If returning a new type, create it in `src/models/`:**

Create `src/models/assets.ts`:
```typescript
export type Assets = {
  // fields matching the API response
};
```

Export it from `src/models/index.ts`:
```typescript
export * from './assets';
```

**5. Export the new fetch params type from `src/index.ts` if it's part of the public API.**

`src/index.ts` re-exports everything via `export * from './client'` — new types in `client.ts` are automatically public. Models go through `src/models/index.ts` → `src/index.ts`.

**6. Update `packages/client/SKILL.md`** with the new method signature and a usage example.

## Hard Constraints

- **No React imports.** No `react` in any import.
- **No CLI logic.** No `commander`, `inquirer`, or filesystem imports.
- **No `dependencies`.** Never add to `dependencies` in `package.json`. Use `devDependencies` for build tools only.
- **Server-side only.** Never use `window`, `document`, or browser globals.

## Build

```bash
npm run build:client
# or from packages/client/
npm run build
```

Output: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types).
