# Contributing to @localess/angular

## Overview

`@localess/angular` is a single unified Angular library built with ng-packagr — one entry point, `@localess/angular`, usable identically in SSR and pure client-side-rendered apps. There is no browser/server split: components, directives, and pipes are platform-agnostic, and `provideLocaless({ token, ... })` is the single provider (a secret token for server-fetched/hydrated content, a public token for content fetched directly in the browser).

**`src/models/index.ts` (types) and `src/utils/index.ts` (values) are the only internal files allowed to import from `@localess/client` directly.** Every other file — services, components, directives, pipes, providers — imports the `@localess/client` types/values it needs through `../models` and/or `../utils` (relative path per file depth) instead. When a new file needs something from `@localess/client` that isn't re-exported yet, add it to whichever of the two files matches (types → `models/index.ts`, values/functions → `utils/index.ts`) rather than importing `@localess/client` directly. This keeps the client-package boundary auditable at two files instead of scattered across every service/component/directive/pipe.

The one sanctioned exception is `src/public-api.ts`'s `export * from '@localess/client'` — this package's unified-entry-point design intentionally re-exports the full `@localess/client` surface to consumers, so leave that pass-through as-is; it is not subject to the rule above.

## Build

```bash
# From monorepo root
npm run build:angular

# Or directly from packages/angular/
npx ng build localess-angular
```

Output goes to `packages/angular/dist/`. Required before running `playgrounds/angular-ssr`.

## Adding a Component

1. Create `packages/angular/src/components/<name>.component.ts`
2. Export from `packages/angular/src/public-api.ts`
3. Update `packages/angular/SKILL.md`

## Adding a Pipe

1. Create `packages/angular/src/pipes/<name>.pipe.ts`
2. Export from `packages/angular/src/public-api.ts`
3. Update `packages/angular/SKILL.md`

## Adding a Service

1. Create `packages/angular/src/services/<name>.service.ts`
2. If it needs `@localess/client` access, inject `LocalessClientService` rather than calling `localessClient()` directly
3. Register it in `provideLocaless()` (`packages/angular/src/localess.providers.ts`) if it should be available without the consumer registering it themselves
4. Export from `packages/angular/src/public-api.ts`
5. Update `packages/angular/SKILL.md`

## Upstream Changes

If `@localess/client` adds or removes a public API method or type:
1. Update `LocalessClientService` (`packages/angular/src/services/client.service.ts`) and any service that uses it
2. Rebuild: `npm run build:angular`
3. Update `SKILL.md`
