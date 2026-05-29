<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

---

# @localess/angular

Angular SDK for the [Localess](https://github.com/Lessify/localess) headless CMS. Provides two independent entry points — **browser** and **server** — for content delivery, rich text rendering, asset management, and Visual Editor integration in both client-side and server-side rendered Angular applications.

> **Security note:** The `browser` entry point requires no API token and is safe to use in client-side code. The `server` entry point requires your Localess API token and must only be used in server-side code to keep the token secret.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Browser Module](#browser-module)
  - [Setup](#browser-setup)
  - [Schema Components](#schema-components)
  - [Directives](#directives)
  - [Pipes](#pipes)
  - [Asset Service](#browser-asset-service)
  - [Visual Editor Integration](#visual-editor-integration)
- [Server Module](#server-module)
  - [Setup](#server-setup)
  - [Content Service](#content-service)
  - [Asset Service](#server-asset-service)
  - [Translation Service](#translation-service)
- [SSR with TransferState](#ssr-with-transferstate)
- [Angular Image Optimization](#angular-image-optimization)
- [API Reference](#api-reference)

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

**Peer dependencies:** `@angular/core`, `@angular/common`, `@angular/compiler` — versions `^19.0.0 || ^20.0.0 || ^21.0.0`.

---

## Quick Start

**1. Register the browser provider** in `app.config.ts`:

```ts
// app.config.ts
import { provideLocalessBrowser } from '@localess/angular/browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLocalessBrowser({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
    }),
  ],
};
```

**2. Register the server provider** in `app.config.server.ts`:

```ts
// app.config.server.ts
import { mergeApplicationConfig } from '@angular/core';
import { provideLocalessServer } from '@localess/angular/server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideLocalessServer({
      origin: 'https://my-localess.web.app',
      spaceId: 'YOUR_SPACE_ID',
      token: 'YOUR_SECRET_TOKEN',
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

**3. Fetch content on the server** and render it on the client:

```ts
// In a server-side resolver or component
import { ServerContentService } from '@localess/angular/server';

const contentService = inject(ServerContentService);
const content = await firstValueFrom(contentService.getContentBySlug('home'));
```

---

## Browser Module

Import from `@localess/angular/browser`.

### Browser Setup

Register `provideLocalessBrowser()` once in your root `ApplicationConfig`. It configures all browser-side services and optionally loads the Visual Editor sync script.

```ts
import { provideLocalessBrowser } from '@localess/angular/browser';

provideLocalessBrowser({
  origin: 'https://my-localess.web.app', // Required. Localess instance URL (no trailing slash)
  spaceId: 'YOUR_SPACE_ID',             // Required. Found in Localess Space settings
  enableSync: true,                      // Optional. Loads the Visual Editor sync script
  debug: false,                          // Optional. Enables console logging
})
```

| Option | Type | Required | Description |
|---|---|---|---|
| `origin` | `string` | ✅ | Fully qualified Localess URL, e.g. `https://my-localess.web.app` |
| `spaceId` | `string` | ✅ | Space ID from the Localess Space settings |
| `enableSync` | `boolean` | — | When `true`, injects the Visual Editor sync script into the page |
| `debug` | `boolean` | — | When `true`, logs internal activity to the browser console |

`provideLocalessBrowser()` also registers Angular's built-in `IMAGE_LOADER` provider so that `NgOptimizedImage` automatically appends `?w=<width>` to Localess asset URLs for responsive image optimization.

---

### Schema Components

Schema components are abstract base classes you extend to render CMS content. They automatically set the `data-ll-id` and `data-ll-schema` attributes on the host element so the Localess Visual Editor can highlight and select components on the page.

Three variants are available depending on whether you prefer `@Input()` decorators, signal inputs, or a custom data binding approach.

---

#### `SchemaWithInputComponent<T>` — Decorator Input *(recommended for most cases)*

Extend this class when you want to receive the schema data via a traditional `@Input()`. The base class declares the required `data` input and optional `links` / `references` inputs.

```ts
import { Component } from '@angular/core';
import { SchemaWithInputComponent } from '@localess/angular/browser';

// Define a TypeScript interface matching your Localess schema
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
export class HeroSectionComponent extends SchemaWithInputComponent<HeroSection> {}
```

In the template, `data`, `links`, and `references` are available directly. Use the `assetUrl()` and `findLink()` helpers provided by the base class:

```html
<!-- hero-section.component.html -->
<section>
  <h1>{{ data.title }}</h1>
  <p>{{ data.subtitle }}</p>
  <img [src]="assetUrl(data.backgroundImage)" [alt]="data.title" />
  <a [href]="findLink(data.ctaLink)">Learn more</a>
</section>
```

Use the component in a parent template by passing the schema object from the CMS:

```html
<app-schema-hero-section [data]="content.data" [links]="links" />
```

---

#### `SchemaWithSignalComponent<T>` — Signal Input *(Angular 17+)*

Extend this class when you prefer Angular signal inputs. The base class declares `data = input.required<T>()`, `links = input<Links>()`, and `references = input<References>()` as signals.

```ts
import { Component } from '@angular/core';
import { SchemaWithSignalComponent } from '@localess/angular/browser';

@Component({
  selector: 'app-schema-hero-section',
  standalone: true,
  templateUrl: './hero-section.component.html',
})
export class HeroSectionComponent extends SchemaWithSignalComponent<HeroSection> {}
```

In the template, read inputs with function-call syntax:

```html
<section>
  <h1>{{ data().title }}</h1>
  <img [src]="assetUrl(data().backgroundImage)" />
  <a [href]="findLink(data().ctaLink)">Learn more</a>
</section>
```

---

#### `SchemaComponent<T>` — Custom Binding

Extend this class when you want to define your own inputs but still benefit from Visual Editor host bindings. Implement the required `content()` method to return the active schema object — the base class uses it to set `data-ll-id` and `data-ll-schema` on the host element.

```ts
import { Component, input } from '@angular/core';
import { SchemaComponent } from '@localess/angular/browser';
import type { ContentDataSchema, Links } from '@localess/angular/browser';

@Component({
  selector: 'app-schema-hero-section',
  standalone: true,
  templateUrl: './hero-section.component.html',
})
export class HeroSectionComponent extends SchemaComponent {
  data = input.required<HeroSection>();
  links = input<Links>();

  override content(): ContentDataSchema {
    return this.data();
  }
}
```

---

#### Base class helpers

All three schema base classes expose:

| Member | Signature | Description |
|---|---|---|
| `assetUrl(asset)` | `(asset: ContentAsset) => string` | Builds the full CDN URL for a Localess asset |
| `findLink(link)` | `(link: ContentLink) => string` | Resolves a CMS link to a path or URL |
| `config` | `LocalessBrowserConfig` | Injected browser configuration |

---

### Directives

Use these directives when you have a component or element that is **not** a schema component but should still be selectable in the Visual Editor.

#### `[data-ll-id]` and `[data-ll-schema]`

Marker directives. Apply both together to any element to make it recognizable in the Visual Editor. Set the attribute values manually:

```html
<div [attr.data-ll-id]="item._id" [attr.data-ll-schema]="item._schema">
  <!-- content -->
</div>
```

#### `[data-ll-field]`

Marks an individual field within a schema for field-level selection in the Visual Editor:

```html
<p data-ll-field="subtitle">{{ data.subtitle }}</p>
```

#### `[llContent]`

A convenience directive that sets both `data-ll-id` and `data-ll-schema` on the host element from a single `ContentDataSchema` input binding. Useful for sub-schemas rendered without a dedicated component:

```ts
import { ContentDirective } from '@localess/angular/browser';

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

### Pipes

Import individual pipes into the `imports` array of any standalone component that uses them.

#### `llAsset` — Asset URL

Transforms a `ContentAsset` object into a fully qualified CDN URL. Equivalent to `SchemaComponent.assetUrl()`.

```ts
import { AssetPipe } from '@localess/angular/browser';

@Component({
  imports: [AssetPipe],
})
```

```html
<img [src]="data.image | llAsset" alt="..." />
```

---

#### `llLink` — Link Resolution

Resolves a `ContentLink` from the links map to a navigable path or URL. The pipe takes the `links` map as the first argument and the `ContentLink` object as the value:

```ts
import { LinkPipe } from '@localess/angular/browser';
```

```html
<a [href]="links | llLink: data.ctaLink">Visit</a>
```

Link resolution behavior:

| `ContentLink.type` | Result |
|---|---|
| `"content"` | Looks up `link.uri` in the `links` map and returns `/<fullSlug>` |
| `"url"` | Returns `link.uri` as-is |

---

#### `llRtToHtml` — Rich Text to HTML

Converts a Localess RichText field (Tiptap JSON) to an HTML string. Supports headings (H1–H6), bold, italic, strike, underline, bullet lists, ordered lists, code, code blocks, and links.

```ts
import { RichTextToHtmlPipe } from '@localess/angular/browser';
```

```html
<div [innerHTML]="data.body | llRtToHtml"></div>
```

The pipe accepts `JSONContent | ContentRichText | string | null | undefined`. If passed a plain string it returns it unchanged; `null` and `undefined` return an empty string.

---

#### `llSafeHtml` — Safe HTML

Bypasses Angular's DomSanitizer for a trusted HTML string. Always apply this after `llRtToHtml` when binding to `[innerHTML]` to avoid Angular stripping elements:

```ts
import { RichTextToHtmlPipe, SafeHtmlPipe } from '@localess/angular/browser';

@Component({
  imports: [RichTextToHtmlPipe, SafeHtmlPipe],
})
```

```html
<div [innerHTML]="data.body | llRtToHtml | llSafeHtml"></div>
```

> **Security:** `llSafeHtml` calls `DomSanitizer.bypassSecurityTrustHtml()`. Only use it with HTML that comes directly from your trusted Localess space.

---

### Browser Asset Service

`BrowserAssetService` is an injectable service that generates asset URLs programmatically. It is equivalent to the `assetUrl()` method on schema components.

```ts
import { BrowserAssetService } from '@localess/angular/browser';

@Component({ ... })
export class MyComponent {
  private assetService = inject(BrowserAssetService);

  getImageUrl(asset: ContentAsset): string {
    return this.assetService.link(asset);
  }

  // Also accepts a raw URI string
  getImageUrlByUri(uri: string): string {
    return this.assetService.link(uri);
  }
}
```

> This service is browser-only. It logs an error if instantiated during SSR. Use `ServerAssetService` on the server.

---

### Visual Editor Integration

The Localess Visual Editor enables live in-browser content editing. Set `enableSync: true` in `provideLocalessBrowser()` to automatically inject the sync script.

To receive real-time content updates from the Visual Editor, subscribe to its events in any component. Guard the subscription with `isPlatformBrowser` to avoid errors during SSR:

```ts
import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalessSync } from '@localess/angular/browser';

@Component({
  selector: 'app-slug',
  standalone: true,
  templateUrl: './slug.component.html',
})
export class SlugComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  liveContent = signal<ContentData | undefined>(undefined);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Only subscribe when running inside the Visual Editor
      if (window.localess) {
        window.localess.on(['input', 'change'], (event) => {
          this.liveContent.set(event.data);
        });
      }
    }
  }
}
```

The `input` event fires on every keystroke; the `change` event fires when the editor saves. Render `liveContent()` instead of the server-fetched data when it is set to give authors a live preview.

---

## Server Module

Import from `@localess/angular/server`.

The server module provides services that call the Localess REST API using a secret API token. All services are SSR-only and log an error if instantiated in the browser. They must be registered via `provideLocalessServer()` in the **server** application config.

### Server Setup

```ts
// app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideLocalessServer } from '@localess/angular/server';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideLocalessServer({
      origin: 'https://my-localess.web.app', // Required
      spaceId: 'YOUR_SPACE_ID',             // Required
      token: 'YOUR_SECRET_TOKEN',           // Required
      version: 'draft',                      // Optional. Omit for published content
      debug: false,                          // Optional
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

| Option | Type | Required | Description |
|---|---|---|---|
| `origin` | `string` | ✅ | Fully qualified Localess URL |
| `spaceId` | `string` | ✅ | Space ID from Localess Space settings |
| `token` | `string` | ✅ | API token from Localess Space settings. Keep this secret — never expose it to the browser |
| `version` | `'draft' \| string` | — | Set to `'draft'` to fetch unpublished content. Omit to fetch published content |
| `debug` | `boolean` | — | When `true`, logs API calls and cache activity to the server console |

---

### Content Service

`ServerContentService` fetches CMS content from the Localess API. All results are cached in-memory for the lifetime of the server request using `Map`-based caches keyed by slug, ID, or link params. This prevents redundant network requests when the same content is resolved multiple times during SSR.

```ts
import { ServerContentService } from '@localess/angular/server';

@Injectable()
export class MyServerService {
  private contentService = inject(ServerContentService);
}
```

#### `getContentBySlug<T>(slug, params?)`

Fetches a content document by its full slug path.

```ts
const content = await firstValueFrom(
  contentService.getContentBySlug<HeroSection>('home')
);

// With params
const draftContent = await firstValueFrom(
  contentService.getContentBySlug<HeroSection>('home', {
    version: 'draft',
    locale: 'en',
    resolveReference: true,
    resolveLink: true,
  })
);
```

#### `getContentById<T>(id, params?)`

Fetches a content document by its unique ID.

```ts
const content = await firstValueFrom(
  contentService.getContentById<ArticlePage>('abc123', { locale: 'fr' })
);
```

#### `getLinks(params?)`

Fetches the full links map — a dictionary of content IDs to their slug paths. Pass this to browser-side schema components to enable link resolution.

```ts
const links = await firstValueFrom(
  contentService.getLinks()
);

// Filter by content kind or parent
const blogLinks = await firstValueFrom(
  contentService.getLinks({
    kind: 'DOCUMENT',
    parentSlug: 'blog',
    excludeChildren: false,
  })
);
```

#### `ContentFetchParams`

| Parameter | Type | Description |
|---|---|---|
| `version` | `'draft' \| string` | Override the global version for this request |
| `locale` | `string` | Locale code, e.g. `'en'`, `'fr'` |
| `resolveReference` | `boolean` | Inline referenced content objects |
| `resolveLink` | `boolean` | Inline link objects |

#### `LinksFetchParams`

| Parameter | Type | Description |
|---|---|---|
| `kind` | `string` | Filter links by content kind |
| `parentSlug` | `string` | Return only links under this parent slug |
| `excludeChildren` | `boolean` | Exclude descendant slugs |

---

### Server Asset Service

`ServerAssetService` generates asset URLs on the server. Its API is identical to `BrowserAssetService`.

```ts
import { ServerAssetService } from '@localess/angular/server';

@Injectable()
export class MyService {
  private assetService = inject(ServerAssetService);

  getUrl(asset: ContentAsset): string {
    return this.assetService.link(asset);
    // or: this.assetService.link('path/to/asset.jpg')
  }
}
```

---

### Translation Service

`ServerTranslationService` fetches all translation strings for a given locale. Results are cached by locale.

```ts
import { ServerTranslationService } from '@localess/angular/server';

@Injectable()
export class MyService {
  private translationService = inject(ServerTranslationService);

  getTranslations(locale: string): Observable<Translations> {
    return this.translationService.fetch(locale);
  }
}
```

The returned `Translations` object is a flat key–value map (`Record<string, string>`).

---

## SSR with TransferState

In an SSR application, content is fetched on the server and must be transferred to the browser to avoid a duplicate fetch on hydration. Use Angular's `TransferState` to store the server response, then read it on the client.

The pattern below uses an abstract service with two implementations — one for the server, one for the browser — and swaps them via the DI system.

**Abstract service** (`localess.service.ts`):

```ts
import { Injectable, makeStateKey } from '@angular/core';
import { Content, Links, ContentData } from '@localess/angular';
import { Observable } from 'rxjs';

@Injectable()
export abstract class LocalessService {
  LINKS_KEY = makeStateKey<Links>('ll:links');

  abstract getLinks(): Observable<Links>;
  abstract getContentBySlug<T extends ContentData>(slug: string | string[], locale?: string): Observable<Content<T>>;
  abstract getContentById<T extends ContentData>(id: string, locale?: string): Observable<Content<T>>;
}
```

**Server implementation** (`localess-server.service.ts`):

```ts
import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ServerContentService } from '@localess/angular/server';
import { LocalessService } from './localess.service';

@Injectable()
export class LocalessServerService extends LocalessService {
  private state = inject(TransferState);
  private contentService = inject(ServerContentService);

  getLinks() {
    return this.contentService.getLinks().pipe(
      tap(links => this.state.set(this.LINKS_KEY, links))
    );
  }

  getContentBySlug<T extends ContentData>(slug: string | string[], locale?: string) {
    const normalizedSlug = Array.isArray(slug) ? slug.join('/') : slug;
    const key = makeStateKey<Content<T>>(`ll:content:slug:${normalizedSlug}`);
    return this.contentService.getContentBySlug<T>(normalizedSlug, { locale }).pipe(
      tap(content => this.state.set(key, content))
    );
  }

  getContentById<T extends ContentData>(id: string, locale?: string) {
    const key = makeStateKey<Content<T>>(`ll:content:id:${id}`);
    return this.contentService.getContentById<T>(id, { locale }).pipe(
      tap(content => this.state.set(key, content))
    );
  }
}
```

**Browser implementation** (`localess-browser.service.ts`):

```ts
import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { of } from 'rxjs';
import { LocalessService } from './localess.service';

@Injectable()
export class LocalessBrowserService extends LocalessService {
  private state = inject(TransferState);

  getLinks() {
    return of(this.state.get(this.LINKS_KEY, {}));
  }

  getContentBySlug<T extends ContentData>(slug: string | string[], locale?: string) {
    const normalizedSlug = Array.isArray(slug) ? slug.join('/') : slug;
    const key = makeStateKey<Content<T>>(`ll:content:slug:${normalizedSlug}`);
    return of(this.state.get(key, {} as Content<T>));
  }

  getContentById<T extends ContentData>(id: string, locale?: string) {
    const key = makeStateKey<Content<T>>(`ll:content:id:${id}`);
    return of(this.state.get(key, {} as Content<T>));
  }
}
```

**Wire them up:**

```ts
// app.config.ts — browser uses browser implementation
providers: [
  { provide: LocalessService, useClass: LocalessBrowserService },
]

// app.config.server.ts — server uses server implementation
providers: [
  { provide: LocalessService, useClass: LocalessServerService },
]
```

**Use the abstract service anywhere** without worrying about the platform:

```ts
@Component({ ... })
export class SlugComponent {
  private localess = inject(LocalessService);

  content = toSignal(this.localess.getContentBySlug('home'));
}
```

---

## Angular Image Optimization

`provideLocalessBrowser()` automatically registers Angular's `IMAGE_LOADER` provider. When you use `NgOptimizedImage` (`ngSrc`) with a Localess asset URL, Angular appends `?w=<requested-width>` to the URL, enabling server-side image resizing:

```html
<img
  ngSrc="{{ data.image | llAsset }}"
  width="800"
  height="600"
  alt="Hero image"
/>
<!-- Rendered src: https://my-localess.web.app/api/v1/spaces/.../assets/image.jpg?w=800 -->
```

This works automatically — no additional configuration required.

---

## API Reference

### `@localess/angular/browser`

| Export | Kind | Description |
|---|---|---|
| `provideLocalessBrowser(options)` | Function | Registers all browser-side providers |
| `SchemaWithInputComponent<T>` | Abstract Class | Base component with `@Input() data: T` |
| `SchemaWithSignalComponent<T>` | Abstract Class | Base component with `data = input.required<T>()` |
| `SchemaComponent<T>` | Abstract Class | Base component requiring `content()` override |
| `ContentIdDirective` | Directive | `[data-ll-id]` marker |
| `ContentSchemaDirective` | Directive | `[data-ll-schema]` marker |
| `ContentFieldDirective` | Directive | `[data-ll-field]` marker |
| `ContentDirective` | Directive | `[llContent]` — sets both id and schema attributes |
| `AssetPipe` | Pipe | `llAsset` — asset to URL |
| `LinkPipe` | Pipe | `llLink` — resolves a ContentLink |
| `RichTextToHtmlPipe` | Pipe | `llRtToHtml` — Tiptap JSON to HTML |
| `SafeHtmlPipe` | Pipe | `llSafeHtml` — bypasses DomSanitizer |
| `BrowserAssetService` | Service | Programmatic asset URL generation |
| `LOCALESS_BROWSER_CONFIG` | InjectionToken | Browser configuration token |
| `LocalessBrowserConfig` | Type | Browser config shape |
| `LocalessBrowserOptions` | Type | Options for `provideLocalessBrowser()` |
| `findLink(links, link)` | Function | Standalone link resolution utility |
| `LocalessSync` | Type | Visual Editor sync event types |

### `@localess/angular/server`

| Export | Kind | Description |
|---|---|---|
| `provideLocalessServer(options)` | Function | Registers all server-side providers |
| `ServerContentService` | Service | Fetches content by slug, ID, or links |
| `ServerAssetService` | Service | Programmatic asset URL generation |
| `ServerTranslationService` | Service | Fetches translations by locale |
| `LOCALESS_SERVER_CONFIG` | InjectionToken | Server configuration token |
| `LocalessServerConfig` | Type | Server config shape |
| `LocalessServerOptions` | Type | Options for `provideLocalessServer()` |

### `@localess/angular`

Re-exports all types from `@localess/client`:

| Type | Description |
|---|---|
| `Content<T>` | CMS document with metadata and typed `data` payload |
| `ContentData` | Base type for schema data objects |
| `ContentDataSchema` | Schema data with `_id` and `_schema` fields |
| `ContentAsset` | Asset reference `{ uri: string }` |
| `ContentLink` | Link reference `{ type: 'content' \| 'url', uri: string }` |
| `ContentRichText` | Tiptap JSON rich text |
| `ContentReference` | Reference to another content document |
| `Links` | Map of content ID → `{ fullSlug: string }` |
| `References` | Map of referenced content objects |
| `Translations` | Flat key–value map of translation strings |
| `ContentFetchParams` | Parameters for content fetch requests |
| `LinksFetchParams` | Parameters for links fetch requests |

---

## License

MIT © [Lessify](https://github.com/Lessify)
