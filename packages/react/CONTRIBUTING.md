# Contributing to @localess/react

React integration layer. Depends on `@localess/client`. Components never fetch data — they accept server-fetched data as props.

## Adding a New Component

**1. Create `src/core/components/<name>.tsx`:**

```typescript
import { forwardRef } from 'react';

import { ContentData, Links, References } from '../models';
import { localessEditable } from '../utils';

export type MyComponentProps<T extends ContentData = ContentData> = {
  data: T;
  links?: Links;
  references?: References;
};

export const MyComponent = forwardRef<HTMLElement, MyComponentProps>(({ data, links, references, ...restProps }, ref) => {
  return (
    <div ref={ref} {...localessEditable(data)} {...restProps}>
      {/* render data fields here */}
    </div>
  );
});
```

Rules:
- Always use `forwardRef` so consumers can attach refs.
- Always spread `{...localessEditable(data)}` on the root element — it adds `data-ll-id` and `data-ll-schema` attributes for Visual Editor targeting (no-ops when sync is disabled).
- Always spread `{...restProps}` on the root element so className, style, etc. pass through.
- Accept `links` and `references` as optional props and forward them to child `LocalessComponent` instances.
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
import { getLocalessClient, localessSyncOn } from '../state';

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
- `vite-plugin-localess-components.ts` — `virtual:localess-components`, the component auto-registry.
- `vite-plugin-localess-init.ts` — `virtual:localess-init`, the SSR-aware `localessInit()` call.
- `localess-vite.ts` — `localessVite()`, the public entry point combining both plugins.

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

Output: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`.
