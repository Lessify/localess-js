# @localess/angular Reference

Angular integration layer for Localess. Builds on `@localess/client` and adds Angular components, directives, pipes, and Visual Editor sync.

**Peer dependencies:** Angular >=21.0.0 <23.0.0 + `@angular/common` + `@angular/compiler`.

## Entry Point

`@localess/angular` ships a single entry point — no `/browser` or `/server` split. `provideLocaless({ token, ... })` works identically for SSR (secret token, content hydrated from server to browser via `LocalessContentService`) and pure client-side-rendered apps (public token, fetched directly in the browser).

## Installation

```bash
npm install @localess/angular
```

## Setup

Call `provideLocaless()` in your `app.config.ts` (and, for SSR apps, again with the secret token in `app.config.server.ts` — the server registration takes precedence during server rendering):

```typescript
import { provideLocaless } from '@localess/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLocaless({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
      token: 'YOUR_PUBLIC_TOKEN', // read-only, published content only — safe in the browser
      enableSync: !environment.production,
    }),
  ],
};
```

```typescript
// app.config.server.ts
import { provideLocaless } from '@localess/angular';

const serverConfig: ApplicationConfig = {
  providers: [
    provideLocaless({
      origin: process.env['LOCALESS_ORIGIN']!,
      spaceId: process.env['LOCALESS_SPACE_ID']!,
      token: process.env['LOCALESS_TOKEN']!, // secret token — server-only
    }),
  ],
};
```

> **Security:** use a secret token only in `app.config.server.ts` — it runs server-side only. Use a public (read-only) token in `app.config.ts` since that configuration is also bundled into the browser.

## Content Fetching — `LocalessContentService`

`LocalessContentService` is a `resource()`-based service that fetches content and, on the server, hydrates it to the browser via `TransferState` — no duplicate network request on hydration, and no manual `TransferState` wiring required.

```typescript
import { Component, inject, input, OnInit } from '@angular/core';
import { LocalessContentService } from '@localess/angular';

export class PageComponent implements OnInit {
  slug = input.required<string>();
  private readonly contentService = inject(LocalessContentService);
  content!: ReturnType<LocalessContentService['contentBySlug']>;

  ngOnInit(): void {
    this.content = this.contentService.contentBySlug(() => this.slug(), { locale: 'en', resolveReference: true });
  }
}
```

```html
@if (content.value(); as data) {
  <h1>{{ data.data['title'] }}</h1>
} @else if (content.isLoading()) {
  <p>Loading…</p>
}
```

`contentBySlug<T>(slug, params?)`, `contentById<T>(id, params?)`, and `links(params?)` all return a `ResourceRef` exposing `.value()`, `.isLoading()`, `.error()` signals.

## `LocalessAssetService` and `LocalessTranslationService`

```typescript
import { LocalessAssetService, LocalessTranslationService } from '@localess/angular';
// assetService.link(asset, params?) → string
// translationService.fetch('en') → Promise<Translations>
```

## Components

### Schema Components

`SchemaComponent<T>` renders Localess content blocks by `_schema` using signal inputs:

```typescript
import { SchemaComponent } from '@localess/angular';
```

```html
<ll-schema-component [data]="contentData" [links]="links" [references]="references" [assets]="assets" />
```

`data`, `links`, `references`, and `assets` are all signal inputs (`data` is required). Use `assetUrl(asset, params?)` and `findLink(link)` from the base class in your template.

### `ContentDirective`

Marks an element as a Localess content block for Visual Editor targeting.

```html
<div [llContent]="contentData">...</div>
```

## Pipes

| Pipe | Input | Output | Description |
|---|---|---|---|
| `llAsset` | `ContentAsset` | `string` | Resolves asset to full URL |
| `llLink` | `ContentLink` | `string` | Resolves link to URL string |
| `llRtToHtml` | `ContentRichText` | `Promise<string>` | Converts Tiptap JSON to an HTML string, lazy-loading `@tiptap/*` on first use — use with `| async` |
| `llSafeHtml` | `string \| null \| undefined` | `SafeHtml` | Marks HTML as safe for Angular |

```html
<img [src]="data.image | llAsset" />
<a [href]="data.link | llLink">{{ data.label }}</a>
<div [innerHTML]="data.body | llRtToHtml | async | llSafeHtml"></div>
```

## Asset Transform Parameters

Pipe the `llAsset` pipe with transform params for image resizing:

```html
<img [src]="data.image | llAsset:{ w: 800, h: 600, f: 'webp' }" />
```

See `AssetTransformParams` in [docs/client.md](client.md#asset-transform-parameters).

## Visual Editor Sync

Set `enableSync: !environment.production` in `provideLocaless()`. `LocalessSyncService` manages the bridge automatically.

```typescript
import { LocalessSyncService } from '@localess/angular';

@Component({ ... })
export class PageComponent implements OnInit {
  pageData = input.required<ContentData>();

  private readonly sync = inject(LocalessSyncService);

  ngOnInit() {
    this.sync.onChange(data => {
      // live update from Visual Editor
    });
  }
}
```

## Build Requirement

`@localess/angular` uses ng-packagr (Angular CLI), not Vite. Run before starting the playground:

```bash
npm run build:angular   # from monorepo root
```

## Common Mistakes

- **Not building before running the playground.** `playgrounds/angular-ssr` reads from `packages/angular/dist/`. Run `npm run build:angular` first.
- **Enabling sync in production.** `enableSync: !environment.production` — the sync script is only useful inside the Localess editor iframe.
- **Forgetting `| async` on `llRtToHtml`.** It returns `Promise<string>` (to lazy-load `@tiptap/*`), so bind it as `data.body | llRtToHtml | async | llSafeHtml`, not directly to `[innerHTML]`.
- **Using a secret token in `app.config.ts`.** That configuration ships to the browser bundle — only use a public (read-only) token there. Keep the secret token in `app.config.server.ts`.
