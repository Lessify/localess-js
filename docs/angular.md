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

`LocalessContentService` fetches content and, on the server, hydrates it to the browser via `TransferState` — no duplicate network request on hydration, and no manual `TransferState` wiring required. All methods return a `Promise`, so the natural place to call them is a route resolver:

```typescript
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Content, LocalessContentService } from '@localess/angular';

const contentResolver: ResolveFn<Content> = route => {
  return inject(LocalessContentService).contentBySlug(route.paramMap.get('slug')!, { locale: 'en', resolveReference: true });
};
```

```typescript
@Component({ ... })
export class PageComponent {
  content = input.required<Content>(); // bound from resolved route data via withComponentInputBinding()
}
```

```html
<h1>{{ content().data['title'] }}</h1>
```

`contentBySlug<T>(slug, params?)`, `contentById<T>(id, params?)`, and `links(params?)` all return a `Promise` — call from any `async` context (a resolver, an event handler); wrap in Angular's `resource()` yourself if a component needs reactive re-fetching.

## `LocalessAssetService` and `LocalessTranslationService`

```typescript
import { LocalessAssetService, LocalessTranslationService } from '@localess/angular';
// assetService.link(asset, params?) → string
// translationService.fetch('en') → Promise<Translations>
```

## Component Registry & Dynamic Rendering

Register `_schema` → component mappings, then render content without a hand-written switch over schema types.

```typescript
import { provideLocaless, withLocalessComponents } from '@localess/angular';

provideLocaless(
  { origin: '...', spaceId: '...', token: '...' },
  withLocalessComponents(
    {
      hero: HeroSectionComponent, // eager
      teaser: () => import('./teaser.component').then(m => m.TeaserComponent), // lazy
    },
    UnknownBlockComponent // optional fallback for unmatched `_schema` keys
  )
);
```

`provideLocaless()` accepts features as trailing arguments (same pattern as `provideRouter()`). `withLocalessComponents` is the only one today.

```html
<!-- top-level: renders a full Content response, wires up Visual Editor sync internally -->
<ll-document [document]="content()" />

<!-- inside a schema component: renders a single nested schema item -->
<ng-container [llComponent]="data().hero" [links]="links()" [references]="references()" [assets]="assets()" />

<!-- for an array field (e.g. a body field), loop it with @for -->
@for (item of data().body; track item._id) {
  <ng-container [llComponent]="item" [links]="links()" [references]="references()" [assets]="assets()" />
}
```

`[llComponent]` resolves an item's `_schema` via the registry and creates the matching component with `ViewContainerRef.createComponent` directly at the `ng-container` anchor — no wrapper element — recreating the component only when its `_schema` changes. Every registered component, including the fallback, must extend `SchemaComponent` — `withLocalessComponents()`'s type signature enforces it, so `data`/`links`/`references`/`assets` are always set unconditionally.

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
