# SKILL: @localess/angular

Angular SDK for the [Localess](https://github.com/Lessify/localess) headless CMS. Ships as a **single unified package** — no `/browser` or `/server` split — providing content delivery, rich text rendering, asset management, and Visual Editor integration for both client-side and server-side rendered Angular applications.

> **Security note:** `provideLocaless()` takes a single `token`. Use a **public token** (read-only, published content and translations only) where the configuration is bundled into the browser (`app.config.ts`). Use a **secret token** only where it stays server-side (`app.config.server.ts`, which takes precedence during server rendering).

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Component Registry & Dynamic Rendering](#component-registry--dynamic-rendering)
- [Content Service](#content-service)
- [Asset Service](#asset-service)
- [Translation Service](#translation-service)
- [Schema Components](#schema-components)
- [Directives](#directives)
- [Pipes](#pipes)
- [Visual Editor Integration](#visual-editor-integration)
- [Angular Image Optimization](#angular-image-optimization)
- [Other Exports](#other-exports)

---

## Installation

```bash
# npm
npm install @localess/angular@latest

# yarn
yarn add @localess/angular@latest

# pnpm
pnpm add @localess/angular@latest
```

**Peer dependencies:** `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/platform-browser` — versions `>=21.0.0 <23.0.0`. Requires Node.js >= 24.

---

## Quick Start

**1. Register the provider** in `app.config.ts`, with a public (read-only) token — this configuration is bundled into the browser:

```ts
// app.config.ts
import { provideLocaless } from '@localess/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLocaless({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
      token: 'YOUR_PUBLIC_TOKEN',
    }),
  ],
};
```

**2. For SSR apps, register it again** in `app.config.server.ts`, with a secret token — this registration takes precedence during server rendering (last provider for a given token wins):

```ts
// app.config.server.ts
import { mergeApplicationConfig } from '@angular/core';
import { provideLocaless } from '@localess/angular';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideLocaless({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
      token: 'YOUR_SECRET_TOKEN',
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

**3. Fetch content** with `LocalessContentService`, e.g. in a route resolver:

```ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Content, LocalessContentService } from '@localess/angular';

const contentResolver: ResolveFn<Content> = route => {
  return inject(LocalessContentService).contentBySlug(route.paramMap.get('slug')!);
};
```

On the server, the fetched content is written to `TransferState`; on the browser, the same call reads it back out instead of re-fetching (or, in a pure client-side-rendered app with no SSR, falls back to fetching directly using the public token).

---

## Setup

`provideLocaless()` registers everything: `LocalessClientService`, `LocalessContentService`, `LocalessAssetService`, `LocalessTranslationService`, `LocalessSyncService`, `LocalessComponentResolver`, the `LOCALESS_CONFIG` and `LOCALESS_SYNC_READY` injection tokens, and Angular's `IMAGE_LOADER`. It throws at startup if `origin`, `spaceId`, or `token` is missing or empty.

```ts
import { provideLocaless } from '@localess/angular';

provideLocaless({
  origin: 'https://my-localess.web.app', // Required. Localess instance URL (no trailing slash)
  spaceId: 'YOUR_SPACE_ID',              // Required. Found in Localess Space settings
  token: 'YOUR_TOKEN',                   // Required. Public token if bundled into the browser, secret token if server-only
  version: 'draft',                      // Optional. Omit for published content
  enableSync: true,                      // Optional. Loads the Visual Editor sync script
  cacheTTL: 300,                         // Optional. Seconds; false disables caching
  debug: false,                          // Optional. Enables console logging
})
```

| Option | Type | Required | Description |
|---|---|---|---|
| `origin` | `string` | ✅ | Fully qualified Localess URL, e.g. `https://my-localess.web.app` |
| `spaceId` | `string` | ✅ | Space ID from the Localess Space settings |
| `token` | `string` | ✅ | Public token where bundled into the browser, secret token where server-only |
| `version` | `'draft'` | — | Fetch draft content; omit for published |
| `enableSync` | `boolean` | — | When `true`, injects the Visual Editor sync script into the page |
| `cacheTTL` | `number \| false` | — | Response cache TTL in seconds (default 300); `false` disables caching |
| `debug` | `boolean` | — | When `true`, logs internal activity to the console |

`provideLocaless()` also registers Angular's built-in `IMAGE_LOADER` provider so that `NgOptimizedImage` automatically appends `?w=<width>` to Localess asset URLs for responsive image optimization.

`provideLocaless()` accepts optional trailing **features**, the same pattern as `provideRouter()`/`provideHttpClient()`. Today there's one: [`withLocalessComponents()`](#component-registry--dynamic-rendering).

---

## Component Registry & Dynamic Rendering

Register a map of content `_schema` keys to Angular components, then render content without writing a switch statement over schema types yourself.

### `withLocalessComponents(components, fallback?)`

Pass to `provideLocaless()` as a feature. Entries can be an eager component reference or a lazy loader (`LocalessComponentLoader`, i.e. `() => Promise<AnySchemaComponent>`) — mix both in the same map. Every entry, including the optional `fallback`, must be a class that extends `SchemaComponent` — `LocalessComponentsMap` values and the `fallback` parameter are typed `AnySchemaComponent` (`Type<SchemaComponent<any>>`), so anything else is a compile error:

```ts
import { provideLocaless, withLocalessComponents } from '@localess/angular';
import { HeroSectionComponent } from './components/hero-section.component';
import { UnknownBlockComponent } from './components/unknown-block.component';

provideLocaless(
  { origin: 'https://my-localess.web.app', spaceId: 'YOUR_SPACE_ID', token: 'YOUR_TOKEN' },
  withLocalessComponents(
    {
      hero: HeroSectionComponent, // eager — bundled immediately
      teaser: () => import('./components/teaser.component').then(m => m.TeaserComponent), // lazy — loaded on demand
    },
    UnknownBlockComponent // optional fallback, rendered when a `_schema` has no match — also a SchemaComponent
  )
);
```

Because every registered component extends `SchemaComponent`, `data`/`links`/`references`/`assets` are always set unconditionally — no need to conditionally declare inputs. The fallback commonly only reads `data()._schema` (e.g. to log or display the unmatched key) and ignores `links`/`references`/`assets`, but it still must extend `SchemaComponent` to be accepted by `withLocalessComponents()`:

```ts
import { SchemaComponent } from '@localess/angular';

@Component({ selector: 'app-unknown-block', template: `Unknown block: {{ data()._schema }}` })
export class UnknownBlockComponent extends SchemaComponent {}
```

### `<ll-document>` — render a full `Content` response

`LocalessDocument` is the top-level entry point for a fetched page. It renders `document().data` through `[llComponent]` (passing the document's `links`/`references`/`assets`) and keeps it live: it subscribes to `LocalessSyncService.onChange` internally, so `input`/`change` events from the Visual Editor update the page without a full reload — no manual sync wiring needed. When `document().data` is missing it renders a placeholder message and logs a console error.

```ts
import { Component, input } from '@angular/core';
import { Content, LocalessDocument } from '@localess/angular';

@Component({
  selector: 'app-slug',
  imports: [LocalessDocument],
  template: `<ll-document [document]="content()" />`,
})
export class SlugComponent {
  content = input.required<Content>();
}
```

### `[llComponent]` — render a single schema item

`LocalessComponentDirective` is used by `<ll-document>` internally, and directly useful inside your own schema components to render a nested schema item. Apply it to a plain `ng-container`; inputs are `llComponent` (`ContentData | null | undefined`), `links`, `references`, and `assets`:

```ts
import { LocalessComponentDirective } from '@localess/angular';

@Component({ imports: [LocalessComponentDirective] })
```

```html
<!-- inside a schema component's own template -->
<ng-container [llComponent]="data().hero" [links]="links()" [references]="references()" [assets]="assets()" />
```

It resolves the item's `_schema` against the registry (via `LocalessComponentResolver`, which caches resolved components so a lazy loader runs once per key) and creates the matching component with `ViewContainerRef.createComponent`, directly at the `ng-container`'s position — no wrapper element is inserted, so the component renders as a direct sibling of whatever its parent's CSS (e.g. Grid/Flexbox) expects.

Recreates the rendered component only when `_schema` changes; otherwise the existing instance is reused and just gets updated `data`/`links`/`references`/`assets` inputs, so unrelated content edits don't tear down component state. A `null`/`undefined` value clears the rendered component.

For an array field (e.g. a page's `body`), loop it yourself with `@for` — `@for` already handles keyed add/remove/reorder, and neither it nor `ng-container` produce a DOM element, so nesting stays wrapper-free at any depth:

```html
@for (item of data().body; track item._id) {
  <ng-container [llComponent]="item" [links]="links()" [references]="references()" [assets]="assets()" />
}
```

### Unregistered schema keys

When a `_schema` key has no match in the registry: the fallback component (if configured) is rendered, and a console error is logged either way. With no fallback configured, nothing is rendered for that item.

---

## Content Service

`LocalessContentService` fetches content and hydrates it from server to browser via `TransferState`. All methods return a `Promise` — call from anywhere `async`/`await` works, e.g. a route resolver or an event handler; wrap in Angular's `resource()` yourself if you need reactive re-fetching.

```ts
import { LocalessContentService } from '@localess/angular';
import { inject } from '@angular/core';

const contentService = inject(LocalessContentService);
```

### `contentBySlug<T>(slug, params?)`

```ts
content = await contentService.contentBySlug<HeroSection>('home');

// With params
content = await contentService.contentBySlug<HeroSection>('home', {
  version: 'draft',
  locale: 'en',
  resolveReference: true,
  resolveLink: true,
});
```

### `contentById<T>(id, params?)`

```ts
content = await contentService.contentById<ArticlePage>('abc123', { locale: 'fr' });
```

### `links(params?)`

```ts
links = await contentService.links({ kind: 'DOCUMENT', parentSlug: 'blog', excludeChildren: false });
```

### `ContentFetchParams`

| Parameter | Type | Description |
|---|---|---|
| `version` | `'draft'` | Override the global version for this request |
| `locale` | `string` | Locale code, e.g. `'en'`, `'fr'` |
| `resolveReference` | `boolean` | Populate `references` — **one level only** |
| `resolveLink` | `boolean` | Populate `links` with content metadata |
| `resolveAsset` | `boolean` | Populate `assets` with asset metadata |

Resolution is all-or-nothing with no depth option. A resolved reference's own
`references`/`links`/`assets` are **arrays of ids**, not maps. A deleted target is silently omitted
from the map and the request still succeeds. See `docs/client.md`.

### `LinksFetchParams`

| Parameter | Type | Description |
|---|---|---|
| `kind` | `'DOCUMENT' \| 'FOLDER'` | Filter links by content kind; omit for all |
| `parentSlug` | `string` | Return only links under this parent slug |
| `excludeChildren` | `boolean` | Exclude descendant slugs |

### Reading the result

Each method returns a `Promise` that rejects on a failed fetch (e.g. `LocalessApiError` for a 404) — handle it wherever you call it, such as a route resolver:

```ts
const contentResolver: ResolveFn<Content | undefined> = async () => {
  try {
    return await contentService.contentBySlug('home');
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) return undefined;
    throw error;
  }
};
```

---

## Asset Service

`LocalessAssetService` generates asset URLs. Its API is identical whether called server-side or in the browser.

```ts
import { LocalessAssetService } from '@localess/angular';

@Injectable()
export class MyService {
  private assetService = inject(LocalessAssetService);

  getUrl(asset: ContentAsset): string {
    return this.assetService.link(asset);
    // or: this.assetService.link('path/to/asset.jpg')
  }
}
```

`SchemaComponent.assetUrl()` and the `llAsset` pipe use the same underlying logic (`LocalessClientService.assetLink()`) — all three are equivalent.

### Requesting a transformed asset (resize / format conversion)

Pass an `AssetTransformParams` object as the second argument to request a resized image or a different output format:

```ts
assetService.link(asset, { w: 400, f: 'webp' });
assetService.link(asset, { w: 800, h: 600, q: 70, f: 'avif' });
```

| Param | Type | Description |
|---|---|---|
| `w` | `number` | Target width in pixels |
| `h` | `number` | Target height in pixels (combined with `w`, crops to cover the box) |
| `q` | `number` | Output quality 1–100 (default 85; ignored for PNG) |
| `f` | `'webp' \| 'jpeg' \| 'png' \| 'avif'` | Converts the output format |
| `download` | `boolean` | Forces a browser download via `Content-Disposition` |
| `thumbnail` | `boolean` | Extracts the first frame of an animated/video asset before resizing |

---

## Translation Service

`LocalessTranslationService` fetches translation strings for a given locale.

```ts
import { LocalessTranslationService } from '@localess/angular';

@Injectable()
export class MyService {
  private translationService = inject(LocalessTranslationService);

  async getTranslations(locale: string) {
    return this.translationService.fetch(locale);
  }
}
```

The returned `Translations` object is a flat key–value map (`Record<string, string>`).

---

## Schema Components

`SchemaComponent<T>` is the abstract base class you extend to render a Localess content schema. It automatically sets the `data-ll-id` and `data-ll-schema` attributes on the host element so the Localess Visual Editor can highlight and select components on the page.

The base class declares four signal inputs:

| Input | Type | Description |
|---|---|---|
| `data` | `input.required<T>()` | The schema data object (required) |
| `links` | `input<Links>()` | Map of content ID → slug, used by `findLink()` |
| `references` | `input<References>()` | Map of resolved `ContentReference` objects |
| `assets` | `input<Assets>()` | Map of asset metadata |

```ts
import { Component } from '@angular/core';
import { SchemaComponent } from '@localess/angular';
import type { ContentAsset, ContentLink } from '@localess/angular';

interface HeroSection {
  _id: string;
  _schema: string;
  title: string;
  subtitle: string;
  backgroundImage: ContentAsset;
  ctaLink: ContentLink;
}

@Component({
  selector: 'app-schema-hero-section',
  standalone: true,
  templateUrl: './hero-section.component.html',
})
export class HeroSectionComponent extends SchemaComponent<HeroSection> {}
```

```html
<!-- hero-section.component.html -->
<section>
  <h1>{{ data().title }}</h1>
  <p>{{ data().subtitle }}</p>
  <img [src]="assetUrl(data().backgroundImage)" [alt]="data().title" />
  <a [href]="findLink(data().ctaLink)">Learn more</a>
</section>
```

Normally `<ll-document>` / `[llComponent]` instantiate schema components for you via the registry. To render one directly, bind its inputs yourself (`Content.data` is optional, so guard it — `data` is a required input):

```html
@if (content().data; as data) {
  <app-schema-hero-section [data]="data" [links]="content().links" [references]="content().references" [assets]="content().assets" />
}
```

### Base class helpers

| Member | Signature | Description |
|---|---|---|
| `assetUrl(asset, params?)` | `(asset: ContentAsset, params?: AssetTransformParams) => string` | Builds the full CDN URL for a Localess asset, with optional transform params |
| `findLink(link)` | `(link: ContentLink) => string` | Resolves a CMS link to a path or URL, using the `links` input |

`findLink(link)` resolves a `ContentLink` field: internal `content` links are looked up in the `links` input (a map of content ID → slug) and resolve to `/<fullSlug>` (or `/not-found` if the ID isn't found); `url` links are returned as-is.

---

## Directives

Use these directives when you have a component or element that is **not** a schema component but should still be selectable in the Visual Editor.

### `[data-ll-id]` and `[data-ll-schema]`

Marker directives (`ContentIdDirective`, `ContentSchemaDirective`) — empty classes; the Visual Editor reads the attributes themselves. Apply both together to any element to make it recognizable in the Visual Editor:

```html
<div [attr.data-ll-id]="item._id" [attr.data-ll-schema]="item._schema">
  <!-- content -->
</div>
```

### `[data-ll-field]`

Marker directive (`ContentFieldDirective`). Marks an individual field within a schema for field-level selection in the Visual Editor:

```html
<p data-ll-field="subtitle">{{ data.subtitle }}</p>
```

### `[llContent]`

A convenience directive that sets both `data-ll-id` and `data-ll-schema` on the host element from a single `ContentDataSchema` input binding:

```ts
import { ContentDirective } from '@localess/angular';

@Component({
  imports: [ContentDirective],
})
export class PageComponent {}
```

```html
<div [llContent]="subSchema">
  <!-- sub-schema content -->
</div>
```

---

## Pipes

Import individual pipes into the `imports` array of any standalone component that uses them.

### `llAsset` — Asset URL

```ts
import { AssetPipe } from '@localess/angular';

@Component({ imports: [AssetPipe] })
```

```html
<img [src]="data.image | llAsset" alt="..." />
<img [src]="data.image | llAsset:{ w: 400, f: 'webp' }" alt="..." />
```

See [Requesting a transformed asset](#requesting-a-transformed-asset-resize--format-conversion) above for the full `AssetTransformParams` field reference.

### `llLink` — Link Resolution

```ts
import { LinkPipe } from '@localess/angular';
```

```html
<a [href]="links | llLink: data.ctaLink">Visit</a>
```

The piped value is the `Links` map; the argument is the `ContentLink` to resolve.

| `ContentLink.type` | Result |
|---|---|
| `"content"` | Looks up `link.uri` in the `links` map and returns `/<fullSlug>` (`/not-found` if missing) |
| `"url"` | Returns `link.uri` as-is |

### `llRichText` — Rich Text to SafeHtml

Converts a Localess RichText field (Tiptap JSON) to sanitizer-trusted HTML, **synchronously** — built on `@localess/richtext`, no TipTap at runtime, no `| async`, no `| llSafeHtml`:

```ts
import { LocalessRichTextPipe } from '@localess/angular';

@Component({ imports: [LocalessRichTextPipe] })
```

```html
<div [innerHTML]="data.body | llRichText"></div>
```

The pipe accepts `LocalessRichTextInput` (a doc, node, node array, `ContentRichText`, or `null`/`undefined` → empty). An optional argument passes per-node string renderers (`LocalessRichTextRenderers<string>`): `data.body | llRichText:renderers`. Supports paragraphs, headings (H1–H6), bold, italic, strike, underline, bullet lists, ordered lists, code, code blocks, and links; link `href`s are sanitized (`javascript:`/`data:` stripped).

### `<ll-rich-text>` — Rich Text component

`LocalessRichText` renders the field into its host element via `[innerHTML]`; re-renders on signal changes. Inputs: `content` (required, `LocalessRichTextInput`) and `renderers` (optional, `LocalessRichTextRenderers<string>`):

```ts
import { LocalessRichText } from '@localess/angular';

@Component({ imports: [LocalessRichText] })
```

```html
<ll-rich-text [content]="data.body" />
<ll-rich-text [content]="data.body" [renderers]="myRenderers" />
```

### `llSafeHtml` — Safe HTML

Bypasses Angular's `DomSanitizer` for a trusted HTML string. Accepts `string | null | undefined` (treated as empty HTML).

```html
<div [innerHTML]="trustedHtmlString | llSafeHtml"></div>
```

> **Security:** `llSafeHtml` calls `DomSanitizer.bypassSecurityTrustHtml()`. Only use it with HTML that comes directly from your trusted Localess space.

---

## Visual Editor Integration

The Localess Visual Editor enables live in-browser content editing. Set `enableSync: true` in `provideLocaless()` to automatically inject the sync script.

Inject `LocalessSyncService` and use `onChange()` — it already covers the `enabled()` check (browser + Visual Editor iframe) and the `ready()` wait:

```ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { LocalessSyncService } from '@localess/angular';

@Component({
  selector: 'app-slug',
  standalone: true,
  templateUrl: './slug.component.html',
})
export class SlugComponent implements OnInit {
  private sync = inject(LocalessSyncService);
  liveContent = signal<ContentData | undefined>(undefined);

  ngOnInit(): void {
    this.sync.onChange(event => this.liveContent.set(event.data));
  }
}
```

`onChange(callback)` is shorthand for `on(['input', 'change'], callback)`: the `input` event fires on every keystroke, `change` fires when the editor saves. Render `liveContent()` instead of the server-fetched data when it is set, to give authors a live preview.

For other event types (`save`, `publish`, `unpublish`, `pong`, `enterSchema`, `hoverSchema`, `leaveSchema`), use `on(event, callback)` — `event` is a single `EventToAppType` or an array, and the callback is narrowed to the matching variant(s) (`EventToAppOf<T>`):

```ts
this.sync.on(['save', 'publish'], event => console.info(`Content ${event.type}d`));
```

Both methods are no-ops if sync isn't enabled or usable in the current context — no need to check `enabled()` yourself. The service also exposes `enabled(): boolean` (`enableSync: true` + running in the browser + inside the Visual Editor iframe) and `ready(): Promise<void>` (resolves once the sync script has loaded and `window.localess` exists; resolves immediately when sync is disabled, and never rejects — a failed script load is logged instead). `ready()` returns the `LOCALESS_SYNC_READY` injection token's value, which `provideLocaless()` sets when `enableSync: true`.

If you render with `<ll-document>`, none of this is needed — it subscribes to `onChange` for you.

---

## Angular Image Optimization

`provideLocaless()` automatically registers Angular's `IMAGE_LOADER` provider. When you use `NgOptimizedImage` (`ngSrc`) with a Localess asset URL, Angular appends `?w=<requested-width>` to the URL, enabling server-side image resizing:

```html
<img
  ngSrc="{{ data.image | llAsset }}"
  width="800"
  height="600"
  alt="Hero image"
/>
<!-- Rendered src: https://my-localess.web.app/api/v1/spaces/.../assets/image.jpg?w=800 -->
```

This works automatically — no additional configuration required. The loader only rewrites URLs under `<origin>/api/v1/spaces/<spaceId>/assets/`; other `src` values pass through unchanged.

---

## Other Exports

Everything below is exported from `@localess/angular` alongside the APIs above.

| Export | Kind | Description |
|---|---|---|
| `LocalessClientService` | service | Thin DI wrapper around `localessClient()` built from `LOCALESS_CONFIG`: `getLinks()`, `getContentBySlug()`, `getContentById()`, `getTranslations()`, `assetLink()`. No `TransferState` hydration — prefer `LocalessContentService` for content. |
| `LocalessComponentResolver` | service | Resolves `_schema` keys against the registry: `has(key)`, `resolve(key): Promise<Type<SchemaComponent> \| null>` (cached; falls back to the fallback component). Used by `[llComponent]`. |
| `LOCALESS_CONFIG`, `LocalessConfig` | token / type | The resolved provider configuration (same shape as `LocalessOptions`). |
| `LocalessOptions` | type | The `provideLocaless()` options object. |
| `LOCALESS_SYNC_READY` | token | `Promise<void>` that resolves when the sync script has loaded (already-resolved when sync is disabled). |
| `LOCALESS_COMPONENTS`, `LOCALESS_FALLBACK_COMPONENT` | tokens | Registry and fallback tokens populated by `withLocalessComponents()`. |
| `LocalessComponentsMap`, `LocalessComponentLoader`, `AnySchemaComponent` | types | Registry map, lazy loader, and `Type<SchemaComponent<any>>` component type. |
| `isComponentLoader(entry)` | function | Type guard distinguishing a lazy loader from a component class. |
| `findLink`, `buildAssetQueryString`, `isBrowser`, `isIframe`, `loadLocalessSync` | functions | Utilities re-exported from `@localess/client`. |
| `Content`, `ContentData`, `ContentDataSchema`, `ContentAsset`, `ContentLink`, `ContentReference`, `ContentRichText`, `Links`, `References`, `Assets`, `Translations`, `AssetTransformParams`, `ContentFetchParams`, `LinksFetchParams`, `TranslationFetchParams`, `EventToAppType`, `EventToAppOf`, `LocalessRichTextInput`, `LocalessRichTextDocument`, `LocalessRichTextNode`, `LocalessRichTextMark`, … | types | Domain-model types re-exported from `@localess/model`, `@localess/client`, and `@localess/richtext`. |

The package also re-exports the full `@localess/client` surface (`export * from '@localess/client'`), so `LocalessApiError`, `localessClient`, and every client type are importable from `@localess/angular` without adding `@localess/client` as a direct dependency.
