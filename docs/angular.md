# @localess/angular Reference

Angular integration layer for Localess. Builds on `@localess/client` and adds Angular components, directives, pipes, and Visual Editor sync.

**Peer dependencies:** `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/platform-browser` — `>=21.0.0 <23.0.0`. Node.js >= 24.

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

`LocalessContentService` fetches content and, on the server, hydrates it to the browser via `TransferState` — no duplicate network request on hydration, no manual `TransferState` wiring, and (in SSR apps) no browser-side request that would need the secret token. In the browser, a key present in `TransferState` is read once and removed; if it's absent (pure client-side-rendered app, or client-side navigation after hydration) the service falls back to a direct fetch with the configured token. All methods return a `Promise`, so the natural place to call them is a route resolver:

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

`contentBySlug<T>(slug, params?)`, `contentById<T>(id, params?)`, and `links(params?)` all return a `Promise` — call from any `async` context (a resolver, an event handler); wrap in Angular's `resource()` yourself if a component needs reactive re-fetching. The promise rejects with `LocalessApiError` (re-exported from `@localess/angular`) on a non-2xx response.

## `LocalessAssetService`, `LocalessTranslationService`, `LocalessClientService`

```typescript
import { LocalessAssetService, LocalessClientService, LocalessTranslationService } from '@localess/angular';
// assetService.link(asset | path, params?) → string
// translationService.fetch('en', params?) → Promise<Translations>
// clientService.getContentBySlug / getContentById / getLinks / getTranslations / assetLink — raw localessClient() calls, no TransferState
```

`LocalessClientService` is the single place the package calls `localessClient()`; the other services delegate to it. Prefer `LocalessContentService` for content so SSR hydration applies.

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

`provideLocaless()` accepts features as trailing arguments (same pattern as `provideRouter()`). `withLocalessComponents` is the only one today. Besides `LOCALESS_CONFIG` and the services, `provideLocaless()` registers `LocalessComponentResolver` (resolves and caches registry lookups, invoking a lazy loader once per key), `LOCALESS_SYNC_READY` (a `Promise<void>` for the sync script load), and Angular's `IMAGE_LOADER` (appends `?w=<width>` to Localess asset URLs for `NgOptimizedImage`). Other options: `version: 'draft'`, `debug`, `enableSync`, `cacheTTL` (seconds, default 300, `false` disables). It throws if `origin`, `spaceId`, or `token` is empty.

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

`[llComponent]` (`LocalessComponentDirective`; inputs `llComponent`, `links`, `references`, `assets`) resolves an item's `_schema` via the registry and creates the matching component with `ViewContainerRef.createComponent` directly at the `ng-container` anchor — no wrapper element — recreating the component only when its `_schema` changes. Every registered component, including the fallback, must extend `SchemaComponent` — `withLocalessComponents()` types entries as `AnySchemaComponent` (`Type<SchemaComponent<any>>`), so `data`/`links`/`references`/`assets` are always set unconditionally. Unmatched keys log a console error and render the fallback (or nothing). `<ll-document>` (`LocalessDocument`, `document: Content<T>` required input) additionally subscribes to `LocalessSyncService.onChange` so Visual Editor edits replace the rendered data live.

## Components

### Schema Components

`SchemaComponent<T>` is the abstract base class for components that render a Localess content block. It has no template of its own; it declares the signal inputs `data` (`input.required<T>()`), `links`, `references`, `assets`, sets `data-ll-id` / `data-ll-schema` host attributes from `data()`, and offers `assetUrl(asset, params?)` and `findLink(link)` helpers:

```typescript
import { Component } from '@angular/core';
import { SchemaComponent } from '@localess/angular';

@Component({
  selector: 'app-hero',
  template: `<h1>{{ data().title }}</h1><a [href]="findLink(data().cta)">Go</a>`,
})
export class HeroComponent extends SchemaComponent<Hero> {}
```

Registered components are instantiated by `[llComponent]`; to render one directly, bind the inputs yourself (`Content.data` is optional, so guard it):

```html
@if (content().data; as data) {
  <app-hero [data]="data" [links]="content().links" [references]="content().references" [assets]="content().assets" />
}
```

### `ContentDirective` and marker directives

`[llContent]` (`ContentDirective`) sets `data-ll-id` and `data-ll-schema` on the host from a `ContentDataSchema` for Visual Editor targeting of non-schema elements. `ContentIdDirective` (`[data-ll-id]`), `ContentSchemaDirective` (`[data-ll-schema]`), and `ContentFieldDirective` (`[data-ll-field]`) are empty marker directives — the attributes themselves are what the Visual Editor reads.

```html
<div [llContent]="contentData">...</div>
<p data-ll-field="title">{{ data().title }}</p>
```

## Pipes

| Pipe (class) | Input | Argument | Output | Description |
|---|---|---|---|---|
| `llAsset` (`AssetPipe`) | `ContentAsset` | `AssetTransformParams?` | `string` | Resolves asset to full URL |
| `llLink` (`LinkPipe`) | `Links` | `ContentLink` | `string` | Resolves link via the links map (`/<fullSlug>`, `/not-found`, or the raw `url`) |
| `llRichText` (`LocalessRichTextPipe`) | `LocalessRichTextInput` | `LocalessRichTextRenderers<string>?` | `SafeHtml` | Converts Tiptap JSON to sanitizer-trusted HTML, synchronously (built on `@localess/richtext`; optional renderers for per-node overrides) |
| `llSafeHtml` (`SafeHtmlPipe`) | `string \| null \| undefined` | — | `SafeHtml` | Marks HTML as safe for Angular |

```html
<img [src]="data().image | llAsset" />
<a [href]="links() | llLink: data().link">{{ data().label }}</a>
<div [innerHTML]="data().body | llRichText"></div>
```

For rich text there is also a component — `<ll-rich-text>` (`LocalessRichText`) renders the field into its host element via `[innerHTML]` and re-renders on signal changes; inputs `content` (required) and `renderers` (optional):

```html
<ll-rich-text [content]="data().body" />
<ll-rich-text [content]="data().body" [renderers]="myRenderers" />
```

## Asset Transform Parameters

Pipe the `llAsset` pipe with transform params for image resizing:

```html
<img [src]="data.image | llAsset:{ w: 800, h: 600, f: 'webp', fit: 'inside' }" />
```

`fit` controls what happens when both `w` and `h` are set — the API default `cover` crops, while
`inside` shrinks to fit without cropping. See `AssetTransformParams` in
[docs/client.md](client.md#asset-transform-parameters).

## Visual Editor Sync

Set `enableSync: !environment.production` in `provideLocaless()`. `LocalessSyncService` manages the bridge automatically, and `<ll-document>` already subscribes for you. For custom wiring:

```typescript
import { ContentData, LocalessSyncService } from '@localess/angular';

@Component({ ... })
export class PageComponent implements OnInit {
  liveData = signal<ContentData | undefined>(undefined);

  private readonly sync = inject(LocalessSyncService);

  ngOnInit() {
    this.sync.onChange(event => this.liveData.set(event.data)); // `input` + `change` events
    this.sync.on(['save', 'publish'], event => console.info(event.type));
  }
}
```

- `enabled()` — `true` only when `enableSync: true`, running in the browser, and inside the Visual Editor iframe.
- `ready()` — `Promise<void>` resolving once `window.localess` is available (immediately if sync is disabled; never rejects).
- `on(event | event[], callback)` — subscribe to any `EventToAppType`: `save`, `publish`, `unpublish`, `pong`, `input`, `change`, `enterSchema`, `hoverSchema`, `leaveSchema`; callback narrowed via `EventToAppOf<T>`.
- `onChange(callback)` — shorthand for `on(['input', 'change'], callback)`.

`on`/`onChange` are no-ops when `enabled()` is false and wait for `ready()` internally.

## Full Export Surface

`src/public-api.ts` exports: `LocalessDocument`, `LocalessRichText`, `SchemaComponent`, `ContentDirective`, `ContentIdDirective`, `ContentSchemaDirective`, `ContentFieldDirective`, `LocalessComponentDirective`, `provideLocaless`, `LocalessOptions`, `withLocalessComponents`, `isComponentLoader`, `LocalessComponentsMap`, `LocalessComponentLoader`, `AnySchemaComponent`, `LOCALESS_COMPONENTS`, `LOCALESS_FALLBACK_COMPONENT`, `LOCALESS_CONFIG`, `LocalessConfig`, `defaultConfig`, `LOCALESS_SYNC_READY`, `AssetPipe`, `LinkPipe`, `LocalessRichTextPipe`, `SafeHtmlPipe`, `LocalessAssetService`, `LocalessClientService`, `LocalessComponentResolver`, `LocalessContentService`, `LocalessSyncService`, `LocalessTranslationService`, the `models` barrel (type-only re-exports from `@localess/model`, `@localess/client`, `@localess/richtext`), the `utils` barrel (`buildAssetQueryString`, `findLink`, `isBrowser`, `isIframe`, `loadLocalessSync`), and `export * from '@localess/client'` (so `LocalessApiError`, `localessClient`, etc. are available from `@localess/angular`).

## Build Requirement

`@localess/angular` uses ng-packagr (Angular CLI), not Vite. Run before starting the playground:

```bash
npm run build:angular   # from monorepo root
```

## Common Mistakes

- **Not building before running the playground.** `playgrounds/angular-ssr` reads from `packages/angular/dist/`. Run `npm run build:angular` first.
- **Enabling sync in production.** `enableSync: !environment.production` — the sync script is only useful inside the Localess editor iframe.
- **Piping `llRichText` through `| async` or `| llSafeHtml`.** It is synchronous and already returns `SafeHtml` — bind `data.body | llRichText` directly to `[innerHTML]`.
- **Using a secret token in `app.config.ts`.** That configuration ships to the browser bundle — only use a public (read-only) token there. Keep the secret token in `app.config.server.ts`.
