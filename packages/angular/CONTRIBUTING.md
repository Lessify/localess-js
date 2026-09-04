# Contributing to @localess/angular

## Overview

`@localess/angular` is a single unified Angular library built with ng-packagr — one entry point, `@localess/angular`, usable identically in SSR and pure client-side-rendered apps. There is no browser/server split: components, directives, and pipes are platform-agnostic, and `provideLocaless({ token, ... })` is the single provider (a secret token for server-fetched/hydrated content, a public token for content fetched directly in the browser).

**`src/models/index.ts`, `src/utils/index.ts`, and `src/services/client.service.ts` are the only internal files allowed to import from `@localess/client` directly.** Each has one job:
- `models/index.ts` — every `@localess/client` **type** the package needs (`ContentFetchParams`, `LinksFetchParams`, `TranslationFetchParams`, `EventToAppOf`, `EventToAppType`), type-only (`export type { ... }`). It is also the package's models barrel for `@localess/model` domain types (`Content`, `ContentData`, `Links`, `AssetTransformParams`, …) and the `@localess/richtext` model types (`LocalessRichTextInput`, `LocalessRichTextNode`, …). No runtime values live here — `LocalessApiError` is not re-exported through `models`; consumers get it from the package's `export * from '@localess/client'` pass-through (see below), and no internal file currently needs it.
- `utils/index.ts` — every `@localess/client` plain **function** the package needs (`isBrowser`, `isIframe`, `findLink`, `loadLocalessSync`, `buildAssetQueryString`), plus a type-only re-export of `AssetTransformParams`. Not `localessClient` — see below.
- `services/client.service.ts` (`LocalessClientService`) — the one place that calls `localessClient(...)`, Angular's DI-shaped equivalent of the singleton `client.ts`/`core/client.ts` file the other framework packages use. `localessClient` is a callable factory, not a type or a stateless helper, so it's imported here directly rather than re-exported through `models` or `utils`.

Every other file — components, directives, pipes, providers, other services — imports the `@localess/client` types/values it needs through `../models`, `../utils`, or (rarely; usually only `LocalessClientService` itself needs `localessClient`) `../services/client.service` instead (relative path per file depth). When a new file needs something from `@localess/client` that none of the three re-exports yet, add it to whichever matches. This keeps the client-package boundary auditable at three files instead of scattered across every service/component/directive/pipe.

The one sanctioned exception is `src/public-api.ts`'s `export * from '@localess/client'` — this package's unified-entry-point design intentionally re-exports the full `@localess/client` surface to consumers, so leave that pass-through as-is; it is not subject to the rule above.

The same discipline applies to `@localess/richtext` (ADR 007): **`src/pipes/rich-text.pipe.ts` and `src/components/localess-rich-text.component.ts` are the only files allowed to import `@localess/richtext` values** (`renderRichTextToHtml`, plus the `LocalessRichTextInput`/`LocalessRichTextRenderers` types they need); `src/models/index.ts` re-exports the richtext model **types** (`LocalessRichTextDocument`, `LocalessRichTextInput`, `LocalessRichTextMark`, `LocalessRichTextNode`) for everything else.

Quick audit: `grep -rn "from '@localess/client'\|from '@localess/richtext'" src --include=*.ts --exclude=*.test.ts` should list only `models/index.ts`, `utils/index.ts`, `services/client.service.ts`, `pipes/rich-text.pipe.ts`, `components/localess-rich-text.component.ts`, and `public-api.ts`.

## Build

```bash
# From monorepo root
npm run build:angular

# Or directly from packages/angular/
npx ng build localess-angular
```

Output goes to `packages/angular/dist/`. Required before running `playgrounds/angular-ssr`.

## Adding a Component

1. Create `packages/angular/src/components/<name>.component.ts` (standalone, `ll-` selector prefix, signal inputs via `input()` / `input.required()`)
2. Export from `packages/angular/src/public-api.ts`
3. Update `packages/angular/SKILL.md` (and `README.md` / `docs/angular.md` where the same section exists)

Components meant to be registered in the `withLocalessComponents()` registry must extend `SchemaComponent` (`src/components/schema.component.ts`) — `AnySchemaComponent` (`src/localess.components.ts`) types every registry entry and the fallback, and `LocalessComponentDirective` sets the `data`/`links`/`references`/`assets` inputs that base class declares.

## Adding a Directive

1. Create `packages/angular/src/directives/<name>.directive.ts` (standalone; attribute selectors use the `ll` prefix, e.g. `[llContent]`, `[llComponent]`)
2. Export from `packages/angular/src/public-api.ts`
3. Update `packages/angular/SKILL.md`

## Adding a Pipe

1. Create `packages/angular/src/pipes/<name>.pipe.ts` (standalone; pipe names use the `ll` prefix, e.g. `llAsset`, `llRichText`)
2. Export from `packages/angular/src/public-api.ts`
3. Update `packages/angular/SKILL.md`

## Adding a Service

1. Create `packages/angular/src/services/<name>.service.ts` (`@Injectable()` without `providedIn` — services are registered by `provideLocaless()`)
2. If it needs `@localess/client` access, inject `LocalessClientService` rather than calling `localessClient()` directly
3. Register it in `provideLocaless()` (`packages/angular/src/localess.providers.ts`) if it should be available without the consumer registering it themselves — that's where `LocalessClientService`, `LocalessAssetService`, `LocalessTranslationService`, `LocalessContentService`, `LocalessSyncService`, and `LocalessComponentResolver` are registered today
4. Export from `packages/angular/src/public-api.ts`
5. Update `packages/angular/SKILL.md`

Content-fetching methods belong on `LocalessContentService`, which wraps each call in `TransferState` hydration (`loadAndHydrate`): on the server the result is written to `TransferState`; in the browser a present key is read and removed instead of re-fetching. This is what keeps a secret token's responses from being re-requested from the browser in SSR apps — new fetch methods must go through it rather than calling `LocalessClientService` directly.

## Adding a `provideLocaless()` Option

1. Add the field to both `LocalessOptions` (`src/localess.providers.ts`) and `LocalessConfig` (`src/localess.config.ts`) — `provideLocaless()` spreads options into the `LOCALESS_CONFIG` value
2. If it's forwarded to `localessClient()`, pass it through in `LocalessClientService` (`src/services/client.service.ts`)
3. Update the options table in `SKILL.md` and `README.md`

## Upstream Changes

If `@localess/client` adds or removes a public API method or type:
1. Update `LocalessClientService` (`packages/angular/src/services/client.service.ts`) and any service that uses it
2. Rebuild: `npm run build:angular`
3. Update `SKILL.md`
