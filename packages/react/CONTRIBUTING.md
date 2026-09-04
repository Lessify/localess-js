# Contributing to @localess/react

React integration layer. Depends on `@localess/client`, `@localess/model`, and `@localess/richtext`. Components never fetch data — they accept server-fetched data as props.

`@localess/client` is an implementation detail of this package. Consumer-facing code (playgrounds, docs, examples — including `vite.config.ts`/`react-router.config.ts`-style build scripts that need a standalone client for tasks like prerender-path enumeration) must only ever import from `@localess/react` or one of its subpath exports (`@localess/react/ssr`, `@localess/react/rsc`, `@localess/react/vite`, `@localess/react/vite/virtual-modules`) — never `@localess/client` directly. If something from `@localess/client` isn't re-exported yet, add it to the appropriate export surface's re-exports (`src/index.ts` for the SPA export, `src/ssr/index.ts` for server-only) rather than telling consumers to import `@localess/client` themselves.

**`src/core/models/`, `src/core/utils/`, and `src/core/client.ts` are the only places allowed to import from `@localess/client` directly.** Each has one job:
- `core/models/` — every `@localess/client` **type** the package needs, plus `LocalessApiError` (a class, but consumed in type position via `catch`/`instanceof`, so it lives with the domain model). `core/models/index.ts` also re-exports the domain-model types from `@localess/model` (`Content`, `ContentData`, `Assets`, `Links`, …) and the rich text model types from `@localess/richtext`. `core/models/options.ts` additionally defines the React-specific `LocalessOptions` type (extends `LocalessClientOptions` with `components`/`fallbackComponent`/`enableSync`) and `AnyLocalessComponent`; `core/models/localess-schema-props.ts` defines `LocalessSchemaProps`, the props contract for registered schema components.
- `core/utils/` — every `@localess/client` plain **function** the package needs (`isBrowser`, `isIframe`, `findLink`, `loadLocalessSync`, `localessEditable`, `localessEditableField`, `buildAssetQueryString`, `isServer`). Not `localessClient` — see below.
- `core/client.ts` — the one place that calls `localessClient(...)` and wraps it in the singleton (client instance + component registry + Visual Editor sync state) that the rest of the package reads through `localessInit()`/`getLocalessClient()`. `localessClient` is a callable factory, not a type or a stateless helper, so it's imported here directly rather than re-exported through `core/models` or `core/utils`.

Every other file in this package — including the public entry points (`index.ts`, `src/ssr/index.ts`, `src/rsc/index.ts`) — imports the types/values it needs from `./core/models`, `./core/utils`, or `./core/client` (relative path per file depth) instead. When a new file needs something from `@localess/client` that none of the three re-exports yet, add it to whichever matches. (`src/vite/` imports nothing from `@localess/client` — the generated `virtual:localess-init` code imports `localessInit` from `@localess/react` as a string.)

**One documented exception:** `src/ssr/index.ts` re-exports `localessClient` directly from `@localess/client` (not through `core/client`) for standalone build-time scripts (e.g. a `vite.config.ts` enumerating prerender paths) that need a client instance outside the `localessInit()`/`getLocalessClient()` singleton lifecycle — see the comment above that re-export. This is a public-entry-point pass-through, the same kind of sanctioned exception `@localess/angular`'s `public-api.ts` has for the whole client surface — it isn't a second "wrap the client" file.

The same discipline applies to `@localess/richtext` (ADR 007): **`src/core/richtext.ts` is the only file allowed to import `@localess/richtext` values** — it hosts the ReactNode walker; `src/core/models/index.ts` re-exports the richtext model **types** (`LocalessRichTextNode` etc.), and `src/core/components/localess-rich-text.tsx` may take a type-only import. Everything else imports through `../richtext` or the models barrel.

## Entry Points and Directory Layout

`vite.config.mts` builds five entries, listed in `package.json`'s `exports` map:

| Entry | Source | Contents |
|---|---|---|
| `@localess/react` | `src/index.ts` | `core/client`, `core/components`, `core/hooks`, `core/richtext`, `core/utils`, and `core/models` types |
| `@localess/react/ssr` | `src/ssr/index.ts` | `LocalessServerComponent` / `LocalessServerDocument` (no `data-ll-*` attrs, no sync), the non-sync subset of `core/client`, rich text, utils, types, plus the `localessClient` pass-through |
| `@localess/react/rsc` | `src/rsc/index.ts` | Everything from `/ssr`, plus `LocalessComponent`, `useLocaless`, the sync functions, and its own `LocalessDocument` |
| `@localess/react/vite` | `src/vite/index.ts` | `localess()` Vite plugin and its option types |
| `@localess/react/vite/virtual-modules` | `src/vite/virtual-modules.ts` | Ambient `declare module` for `virtual:localess-init` / `virtual:localess-components` |

`src/rsc/` is the Server-Action-driven live-edit pipeline: `localess-document.tsx` (a Server Component — reads any pending edit from `live-edit-cache.ts` via `consumeLiveEdit(document.id)`, renders `LocalessComponent`, and mounts `LiveEditListener`), `live-edit-listener.tsx` (the only `'use client'` file in the package — subscribes to `input`/`change`/`save`/`publish`/`unpublish` and calls the action), `live-edit-action.ts` (`'use server'` — writes/clears the `globalThis` cache and calls `next/cache`'s `revalidatePath` when `process.env.NEXT_RUNTIME` is set), and `live-edit-cache.ts`. `next` is an optional peer dependency and `next/cache` is a build external, imported dynamically. The `/rsc` entry deliberately does **not** re-export `core/components/localess-document.tsx` (the client-side `LocalessDocument`); that one is only on the default export.

## Adding a New Component

**1. Create `src/core/components/<name>.tsx`:**

```typescript
import { forwardRef } from 'react';

import { Assets, ContentData, Links, References } from '../models';
import { localessEditable } from '../utils';

export type MyComponentProps<T extends ContentData = ContentData> = {
  data: T;
  links?: Links;
  references?: References;
  assets?: Assets;
};

export const MyComponent = forwardRef<HTMLElement, MyComponentProps>(({ data, links, references, assets, ...restProps }, ref) => {
  return (
    <div ref={ref} {...localessEditable(data)} {...restProps}>
      {/* render data fields here */}
    </div>
  );
});
```

Rules:
- Always use `forwardRef` so consumers can attach refs.
- Always spread `{...localessEditable(data)}` on the root element — it adds `data-ll-id` and `data-ll-schema` attributes for Visual Editor targeting (always emitted; inert outside the Visual Editor iframe).
- Always spread `{...restProps}` on the root element so className, style, etc. pass through.
- Accept `links`, `references`, and `assets` as optional props and forward them to child `LocalessComponent` instances.
- Do not add a `'use client'` directive to components in `src/core/` — consumers declare the boundary. Only `src/rsc/live-edit-listener.tsx` carries one.
- Never call `getLocalessClient()` or fetch data inside a component.

**2. Export from `src/core/components/index.ts`:**

```typescript
export * from './my-component';
```

**3. Update `packages/react/SKILL.md`** with the new component, its props, and a usage example.

## Adding a New Hook

**1. Create `src/core/hooks/use-<name>.ts`:**

```typescript
import { useEffect, useState } from 'react';

import { ContentData } from '../models';
import { getLocalessClient, localessSyncOn } from '../client';

export const useMyHook = <T extends ContentData = ContentData>(
  param: string
): T | undefined => {
  const [data, setData] = useState<T>();
  const client = getLocalessClient();

  useEffect(() => {
    async function load() {
      // fetch using client, setData with result
      localessSyncOn(['input', 'change'], event => {
        setData(event.data as T);
      });
    }
    load();
  }, [param, client]);

  return data;
};
```

Rules:
- Must be used in a Client Component (`'use client'` in the consumer's file — hooks do not declare it themselves).
- Subscribe via `localessSyncOn(event, callback)` instead of `window.localess?.on()` directly — it wraps the `isSyncEnabled()` check and the `localessSyncReady()` wait (which resolves once the sync script has loaded, avoiding a race where `window.localess` isn't set yet), and narrows the callback's event type to the subscribed event(s). Use `localessSyncOnChange(callback)` instead of `window.localess?.onChange()` as a shorthand for `localessSyncOn(['input', 'change'], callback)` — its callback receives only the `input`/`change` variant, not the full `EventToApp` union.
- `window.localess` has no `.off()` method — do not attempt cleanup.

**2. Export from `src/core/hooks/index.ts`:**

```typescript
export * from './use-my-hook';
```

**3. Update `packages/react/SKILL.md`** with the hook signature and usage example.

## Extending the Vite Plugin

The Vite plugin lives in `src/vite/`:
- `vite-plugin-localess-components.ts` — `virtual:localess-components`, the component auto-registry (`generateComponentsModuleCode` builds the module source; manual `components` paths are resolved with `this.resolve` and throw if missing).
- `vite-plugin-localess-init.ts` — `virtual:localess-init`, the generated `localessInit()` call (identical on SSR and client graphs), and the `LocalessInitOptions` type.
- `localess.ts` — `localess()`, the public entry point combining both plugins; validates `origin`/`spaceId`/`token` and defaults `componentsDir` to `'src'`.
- `index.ts` — the `@localess/react/vite` entry (`localess`, `LocalessOptions`, `LocalessInitOptions`).
- `virtual-modules.ts` — the `@localess/react/vite/virtual-modules` entry: ambient `declare module` declarations so `import 'virtual:localess-init'` type-checks in consumers (added to their tsconfig `types`). Keep it declaration-only.
- `utils/normalize-path.ts` — path normalisation shared by the two plugins.

Rules:
- Both virtual modules are generated as **strings**, not live JS values — a
  `vite.config.ts` option can't become a live cross-graph reference. Manual
  `components` overrides must stay file paths, resolved via `this.resolve`,
  never direct component references.
- `vite-plugin-localess-init.ts` currently ships `token` to both the SSR and
  client graphs unconditionally — a deliberate, temporary exception to the
  "secret token never reaches the client" rule (see the warning on
  `vitePluginLocalessInit`'s JSDoc). Don't quietly "fix" this by re-adding a
  `publicToken` split without checking with a maintainer first; a real
  public/scoped-token mechanism is meant to replace it, not a revert.
- Add new tests to the matching `*.test.ts` file, following the existing
  string-content-assertion style (assert generated code contains expected
  substrings) rather than evaluating the generated code.

## Adding a Utility Function

**1. Create `src/core/utils/<name>.util.ts`:**

```typescript
// Pure function, no side effects, no React imports needed
export function myUtil(input: string): string {
  return input;
}
```

**2. Export from `src/core/utils/index.ts`:**

```typescript
export * from './my-name.util';
```

## Hard Constraints

- **No data fetching in components.** Components accept data as props only. Fetching belongs in Server Components, `getServerSideProps`, or the `useLocaless` hook.
- **No direct `@localess/cli` imports.** Never import from the cli package.

## Build

```bash
npm run build:react
# or from packages/react/
npm run build
```

Config: `vite.config.mts` (library mode, `preserveModules`, `rollup-preserve-directives` keeps `'use client'` / `'use server'` in the output). Externals: `react`, `react-dom`, `@localess/client`, `@localess/richtext`, `next/cache`, `vite`.

Output (CJS `.js` + ESM `.mjs` + `.d.ts` for each): `dist/index`, `dist/ssr/index`, `dist/rsc/index`, `dist/vite/index`, `dist/vite/virtual-modules`, plus one chunk per source module under `dist/core/`, `dist/ssr/`, `dist/rsc/`, `dist/vite/`.
