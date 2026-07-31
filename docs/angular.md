# @localess/angular Reference

Angular integration layer for Localess. Builds on `@localess/client` and adds Angular components, directives, pipes, and Visual Editor sync.

**Peer dependencies:** Angular 19, 20, or 21 + `@angular/common` + `@angular/compiler`.

## Entry Points

`@localess/angular` ships three entry points:

| Import path | Use case |
|---|---|
| `@localess/angular` | Re-exports everything (convenience) |
| `@localess/angular/browser` | Client-side: components, directives, pipes, sync service |
| `@localess/angular/server` | Server-side: content, asset, translation services for SSR |

Always import from the specific sub-entry (`/browser` or `/server`) for optimal tree-shaking.

## Installation

```bash
npm install @localess/angular
```

## Setup

### Browser — `provideLocalessBrowser`

Call in your `app.config.ts` (standalone) or `AppModule` providers:

```typescript
import { provideLocalessBrowser } from '@localess/angular/browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLocalessBrowser({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
      token: 'YOUR_API_TOKEN',
      enableSync: !environment.production,
    }),
  ],
};
```

### Server — `provideLocalessServer`

Call in your `app.config.server.ts`:

```typescript
import { provideLocalessServer } from '@localess/angular/server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideLocalessServer({
      origin: process.env['LOCALESS_ORIGIN']!,
      spaceId: process.env['LOCALESS_SPACE_ID']!,
      token: process.env['LOCALESS_TOKEN']!,
    }),
  ],
};
```

> **Security:** `token` is safe in `app.config.server.ts` because it runs server-side only. Never pass it to `provideLocalessBrowser`.

## Server Services

### `ContentService`

```typescript
import { ContentService } from '@localess/angular/server';
import { inject } from '@angular/core';

export const pageResolver = resolveFn(() => {
  const content = inject(ContentService);
  return content.getContentBySlug<Page>('home', { locale: 'en', resolveReference: true });
});
```

### `AssetService` (server)

```typescript
import { AssetService } from '@localess/angular/server';
// assetService.getAssetUrl(asset, params?)
```

### `TranslationService`

```typescript
import { TranslationService } from '@localess/angular/server';
// translationService.getTranslations('en') → Record<string, string>
```

## Browser Components

### Schema Components

`SchemaComponent<T>` renders Localess content blocks by `_schema` using signal inputs:

```typescript
import { SchemaComponent } from '@localess/angular/browser';
```

```html
<ll-schema [data]="contentData" [links]="links" [references]="references" [assets]="assets" />
```

`data`, `links`, `references`, and `assets` are all signal inputs (`data` is required). Use `assetUrl(asset, params?)` and `findLink(link)` from the base class in your template.

### `ContentDirective`

Marks an element as a Localess content block for Visual Editor targeting.

```html
<div [llContent]="contentData">...</div>
```

## Browser Pipes

| Pipe | Input | Output | Description |
|---|---|---|---|
| `asset` | `ContentAsset` | `string` | Resolves asset to full URL |
| `link` | `ContentLink` | `string` | Resolves link to URL string |
| `richTextToHtml` | `ContentRichText` | `string` | Converts Tiptap JSON to HTML string |
| `safeHtml` | `string` | `SafeHtml` | Marks HTML as safe for Angular |

```html
<img [src]="data.image | asset" />
<a [href]="data.link | link">{{ data.label }}</a>
<div [innerHTML]="data.body | richTextToHtml | safeHtml"></div>
```

## Asset Transform Parameters

Pipe the `asset` pipe with transform params for image resizing:

```html
<img [src]="data.image | asset:{ w: 800, h: 600, f: 'webp' }" />
```

See `AssetTransformParams` in [docs/client.md](client.md#asset-transform-parameters).

## Visual Editor Sync

Set `enableSync: !environment.production` in `provideLocalessBrowser`. The `SyncService` manages the bridge automatically.

```typescript
import { LocalessSyncService } from '@localess/angular/browser';

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

- **Using `/browser` services on the server.** `SyncService` and browser pipes are client-only. Use `/server` services in SSR resolvers and server-rendered code.
- **Not building before running the playground.** `playgrounds/angular-ssr` reads from `packages/angular/dist/`. Run `npm run build:angular` first.
- **Importing `@localess/client` directly in Angular components.** Use the Angular services from `/browser` or `/server` — they wrap the client correctly for Angular's DI system.
- **Enabling sync in production.** `enableSync: !environment.production` — the sync script is only useful inside the Localess editor iframe.
