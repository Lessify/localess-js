# Changelog

All notable changes to the Localess JavaScript/TypeScript SDKs (`@localess/model`, `@localess/client`, `@localess/richtext`, `@localess/schema`, `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro`, `@localess/cli`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows lockstep [Semantic Versioning](https://semver.org/) — all packages share the same version number.

> This file was reconstructed from git history on 2026-08-09, the first time a changelog was introduced into the project. Entries are grouped by the version-bump commits already present in history; purely internal commits (CI tweaks, formatting, the Next.js example app under `apps/`) are generally omitted unless they affect consumers.

## [Unreleased]

### Breaking

- **`AssetTransformParams` no longer accepts `download` or `f: 'original'`.**

  `download` became its own route: replace `assetLink(asset, { download: true })` with
  `assetDownloadLink(asset)`. React: `resolveAssetDownload`. Angular:
  `LocalessAssetService.downloadLink()`. Astro: `resolveAssetDownload`. It takes **no** transform
  parameters — the response never enters the image pipeline, and passing one is rejected with a
  `400`.

  `f: 'original'` simply goes away: **omit every parameter instead.** Nothing is converted
  implicitly now, so a bare `assetLink(asset)` already returns the uploaded file byte-for-byte.
  There is deliberately no `assetOriginalLink` — it would build a second URL for identical output.
  To resize without converting, name the source format explicitly: `{ w: 400, f: 'jpeg' }`
  replaces `{ w: 400, f: 'original' }`.

  TypeScript consumers get a compile error naming the replacement. JavaScript consumers keep
  compiling and get a `400` from the API instead, whose message says what to do.

  **Requires a Localess deployment with v4 asset routes.** Against an older self-hosted Localess
  `assetDownloadLink` returns `404`, because that route does not exist yet. Upgrade the platform
  and the SDK together.

### Changed — asset delivery behaviour (action may be required)

> These are **platform-side** changes to the `/api/v1/spaces/:spaceId/assets/:assetId` endpoint.
> No SDK signature changes, but the bytes and `Content-Type` your asset URLs return do change once
> the platform ships them. Listed here because `assetUrl()` callers see the difference without
> touching their code.

- **No format is converted implicitly.** `f` is the only thing that changes an image's format — a
  URL built without it returns the format that was uploaded, and never puts the API through a
  decode and re-encode.

  **Passing `f` is the recommended way to cut transfer size**: `f: 'webp'` is typically 25–35%
  smaller than the equivalent JPEG, and `f: 'avif'` usually smaller again. It is opt-in rather than
  imposed because a format change is the developer's call.

  A resize without `f` re-encodes in the *source* format — `{ w: 400 }` on a JPEG returns a 400 px
  JPEG. The size changes, the format does not.

- **`q` is no longer defaulted to 80.** Omit it and each encoder applies its own calibrated
  default: JPEG and WebP 80, AVIF 50, PNG lossless. An explicit `q` always wins.

  A quality number is not portable between codecs — AVIF is quantizer-based and sits on a different
  perceptual curve, so 50 there is roughly what 80 is for JPEG. Forcing 80 onto every encoder made
  `f: 'avif'` produce files several times larger than its own default, and larger than the
  equivalent WebP. **If you pass `q` explicitly alongside `f: 'avif'`, re-check the value** — 80
  there is a much higher quality setting than 80 for JPEG.

- **`w` and `h` above the source size now redirect instead of being silently clamped**, and are
  bounded to 1–8192. `?w=5000` on a 400 px asset responds `302` to `?w=400`; a value outside 1–8192
  is rejected with `400`.

  The principle is *one URL, one output*. Clamping meant `w=5000` and `w=99999` returned identical
  bytes under two cache keys, so the CDN stored both and Sharp ran twice for the same result.
  Redirecting collapses every oversized spelling onto one canonical URL instead — the same approach
  the `cv` parameter already uses for content.

  **Responsive images are unaffected.** Browsers follow redirects inside `srcset`, so a ladder that
  walks past a small source still works; its upper entries simply converge on the same canonical
  URL. Nothing upscales.

  With **both** dimensions oversized the box shrinks proportionally rather than per-axis, so `fit`
  keeps its meaning: `?w=5000&h=5000&fit=cover` against 400×300 becomes `?w=300&h=300&fit=cover`, a
  square box that still crops — not `400×300`, which would not.

  Assets with no recorded dimensions are served as requested, since the source size is unknown.

- **Default quality is now 80** (was 85), for requests that do not pass `q`.

- **`download: true` returns the stored original.** Previously it only changed
  `Content-Disposition`; it now also opts out of the WebP default, so a download hands back the file
  that was uploaded, with its original extension. An explicit `f` still wins, and `w`/`h` still
  apply.

- **Transformed responses carry an `ETag`**, and a matching `If-None-Match` returns `304` before any
  re-encode.

- **⚠ Malformed `w`, `h` and `q` are now rejected with `400` instead of being silently ignored** —
  and that `400` is cached for an hour. This is the one change here that can break a URL which
  works today.

  Previously `?w=abc` served the untransformed image; it now fails the request. The case to check
  for is a template emitting a placeholder — `?w=undefined`, `?w=null`, `?w=NaN` — which used to
  degrade gracefully and no longer does. Omit the parameter instead.

  | Value | Before | Now |
  |-------|--------|-----|
  | `w=abc`, `w=undefined`, `w=NaN` | ignored, image served | **`400`** |
  | `w=0`, `w=-5` | ignored, image served | **`400`** |
  | `q=abc` | defaulted | **`400`** |
  | `q=150`, `q=101`, `q=0` | clamped to 100 / 1 | **`400`** |
  | `w=400.9`, `q=50.5` | truncated to 400 / 50 | **`400`** |
  | `w=0400`, `w=4e2` | parsed as 400 | **`400`** |
  | `w=` (empty) | ignored | ignored — unchanged |
  | `w=400`, `q=50` | accepted | accepted — unchanged |

  **Fractions and aliases are rejected as a caching rule, not a pedantic one.** `q=50`, `q=50.1`
  and `q=50.5` all encode at quality 50 and return byte-identical responses — but they are three
  URLs, so three CDN cache entries and three runs of the image pipeline for the same bytes.
  `w=400`, `w=0400` and `w=4e2` do the same for resizing. The usual source of a fraction is a CSS
  width times a fractional device pixel ratio, so **round computed dimensions** before passing them.

  `f` and `fit` already behaved this way; the numeric parameters now match them.

- **`Content-Disposition` for `download: true` is now `attachment`**, not `form-data`. RFC 6266
  defines `inline` and `attachment`; `form-data` is a multipart-body token that only worked because
  browsers fall back to `attachment` for unrecognised types. No practical change for browsers.

- **Non-ASCII asset names now download under their real name.** The header carries an RFC 5987
  `filename*` parameter with an ASCII-safe `filename` fallback, so an asset named in Cyrillic or CJK
  no longer saves as a string of percent-escapes.

- **A `404` for an asset that does not exist is cached; one for an upload still in flight is not.**
  A deleted asset still referenced by published content no longer re-enters the function on every
  page view, while an asset whose upload has not finished is not pinned behind a cached `404`.

### Added

- **`@localess/model`** — `AssetTransformParams['f']` accepts **`'original'`**: returns the stored
  bytes byte-for-byte with an `inline` disposition, without forcing a download the way
  `download: true` does. Use it for a full-quality lightbox, print, or downstream processing.
  Composes with a resize — `{ w: 200, f: 'original' }` scales while keeping the source format.

  Requesting a lossless format the source already is (`f: 'png'` on a PNG) is likewise served as a
  passthrough, since the re-encode would produce equivalent bytes. Lossy formats deliberately still
  re-encode: `f: 'jpeg'` on a JPEG compresses at `q`, which keeps the WebP escape hatch cheap.

- **`@localess/client`** — `buildAssetQueryString` now **throws a `TypeError`** for a `w`, `h` or
  `q` that the API would reject: a non-finite number, or a non-positive `w`/`h`. This surfaces the
  bug at the call site rather than as a `400` cached for an hour in production.

  It matters because `NaN` **is** a `number` to TypeScript, so `{ w: NaN }` — from a failed
  `parseInt`, a division, an absent CMS field — type-checks cleanly and used to build a working URL
  back when the API ignored malformed numerics. `null` slipping through from plain JS behaves the
  same way.

  `w`, `h` and `q` must now be **whole numbers**, and `q` must be within its documented **1–100**
  range — both matching the API exactly. A fraction is rejected rather than truncated: `{ q: 50.5 }`
  encodes identically to `{ q: 50 }` but produces a different URL, and therefore a duplicate CDN
  cache entry. Omitting a parameter is still always valid — `{ w: undefined }` is treated as absent,
  not invalid.

  This is deliberately a throw rather than silently dropping the parameter, which would
  re-introduce at the SDK layer exactly the leniency the API removed.

- **`@localess/angular`** — `NgOptimizedImage` now reaches every transform parameter. The
  `IMAGE_LOADER` registered by `provideLocaless` honours `[loaderParams]`, so `h`, `q`, `f`, `fit`
  and `thumbnail` work through `ngSrc` — previously only `w` did, leaving `ngSrc` strictly less
  capable than the `llAsset` pipe and `LocalessAssetService.link()` in the same package.

  ```html
  <img ngSrc="..." width="800" height="600" [loaderParams]="{ f: 'avif', fit: 'inside' }" />
  ```

  Angular's per-entry width still wins over a `w` in `loaderParams`, so `srcset` generation is
  unaffected. The `height` Angular derives from the declared aspect ratio is deliberately **not**
  forwarded: sending both `w` and `h` switches the API from width-only scaling to a `fit` crop, which
  would silently crop whenever the declared ratio differs from the source's. Pass `h` through
  `loaderParams` to opt into a box.

- **`@localess/client`** — a resilience layer on every request, on by default:
  - **Retries** network failures and `408`/`429`/`500`/`502`/`503`/`504` (3 attempts by default),
    with exponential backoff and **full jitter**. `401`/`403`/`404` throw immediately — a bad token
    will not fix itself. All four fetching methods are `GET`s, so retrying is idempotent.
  - **`Retry-After`** is honoured in preference to the computed backoff, clamped to `maxDelayMs`.
  - **Timeouts** via `timeoutMs` (default 15s, per attempt). Previously `fetch` had no timeout in
    Node, so a hung connection could stall a static build indefinitely.
  - **Cancellation** via `signal` on every fetching method, composed with the client's timeout. A
    caller abort is never retried; a timeout is.
  - **An injectable `fetch`**, for instrumentation, a runtime-specific implementation, or tests.
  - `LocalessApiError` and `LocalessNetworkError` now carry `attempts`, and the rendered error box
    shows an `Attempts` row when a request was retried.

  All options are optional and additive. Set `retry: false` and `timeoutMs: false` for the previous
  behaviour.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Fixed

- **`@localess/angular`** — the `src` attribute of an `ngSrc` image no longer points at the
  untransformed original. Angular builds that attribute by calling the loader with **no width** (see
  `getRewrittenSrc`), for every image rather than only `fill` ones, and the old loader fell through
  to the bare URL whenever width was absent. It now emits whatever `loaderParams` provide.

  This mattered most where `NgOptimizedImage` generates no `srcset` at all — with no `sizes` and a
  declared `width > 1920` or `height > 1080`, Angular skips srcset as "oversized", leaving `src` as
  the only URL. A large hero therefore fetched the full-resolution original. Setting
  `[loaderParams]="{ w: 1920 }"` now bounds it.

### Changed

- **`@localess/client`** — cache keys no longer contain the API token. Previously the key was the
  full request URL, so two clients on one space could not share an entry and any cache that logged
  or persisted keys persisted a credential — which matters more now that keys can leave the process.
  Draft-ness stays in the key via `version`, and failures are still never cached.

  **Consequence:** a cache instance shared between two clients is shared across their tokens. Safe
  for equal permissions; **do not share one between tokens with different permissions**. See
  [ADR 003](docs/decisions/003-ttl-cache-design.md).

- **BREAKING** — the API no longer returns raw `assets`/`links`/`references` **id arrays** on
  documents inside a `references` map. Those arrays are a denormalized index of edges that already
  exist in `data` — a `REFERENCE` field value is `{ kind: 'REFERENCE', uri }` — so they were
  redundant on the wire, and the top-level document already stripped them. Resolved references are
  now consistent with it.

  No type change: `References` stays `Record<string, Content>`, since it is a shared shape reused in
  more than one place. The three collection fields are optional, so they are simply always
  `undefined` on a resolved reference. The behaviour is documented on
  `ContentFetchParams.resolveReference`, which is the endpoint that produces the map.

  To follow a reference, read the `uri` off the field value and look it up in the same map:

  ```ts
  const authorId = content.data?.author?.uri;
  const author = authorId ? content.references?.[authorId] : undefined;
  ```

  This also fixes a silent bug: `References` previously typed its values as `Content`, whose
  `references`/`links`/`assets` are maps, while the runtime values were arrays. So
  `Object.keys(ref.references)` compiled and returned array indices (`"0"`, `"1"`, …) instead of
  content ids. That code now fails to compile.

- **BREAKING (types only)** — **`@localess/model`**: `Content` now declares `locale: string`. The API
  has always returned it on both content endpoints, but the type never described it, so
  `content.locale` did not type-check even though the value was present. Reading it no longer needs
  a cast.

  This is a compile-time break for code that *constructs* a `Content` — most likely test fixtures,
  which now need a `locale`. No runtime behaviour changes, and no response shape changes.

  `ContentMetadata` deliberately does **not** gain `locale`: it types `Links` and `getLinks()`
  results, which genuinely carry none.

  Note the value is the locale the API **actually served**, which may differ from the one requested —
  when a locale does not exist in the space, the API falls back to the space's `localeFallback`.
  Code that assumed the requested locale came back can now verify it.

### Fixed

- **`@localess/client`**: corrected the JSDoc for `resolveReference`, `resolveLink` and
  `resolveAsset`. They previously read as though resolution walked the whole graph; they now state
  that resolution is **one level deep**, all-or-nothing, and that a target which cannot be resolved
  is **silently omitted** from the map while the request still succeeds. The same correction was
  applied to `docs/client.md`, `packages/client/SKILL.md` and `packages/angular/SKILL.md`.
- **`@localess/client`**: `assetLink()` and `buildAssetQueryString()` keep emitting `download` and
  `thumbnail` as valueless flags — the form the Localess API treats as presence and the form the
  Localess UI itself links to. A `thumbnail` request was previously a silent no-op because the API
  tested it for truthiness; that has been fixed on the API side, so `thumbnail: true` now works
  against an updated Localess deployment with no SDK change required.

## [4.0.0] - 2026-09-04

> Major release: the SDK grows from four packages to ten, and shared types move into a dedicated `@localess/model` root package. Package boundaries are documented in [ADR 005](docs/decisions/005-package-boundary-discipline.md), [ADR 007](docs/decisions/007-shared-richtext-package.md), [ADR 008](docs/decisions/008-schema-package.md), and [ADR 009](docs/decisions/009-shared-model-package.md).

### Added

- **`@localess/model`** — new zero-dependency root package holding the shared domain-model types (`Content`, `ContentAsset`, `ContentLink`, `ContentReference`, `ContentRichText`, `Locale`, `Space`, `Translations`, and the schema shapes `SchemaExport`, `SchemaField`, `SchemaFieldKind`, …). `@localess/client`, `@localess/richtext`, and `@localess/schema` depend on it and re-export what they need.
- **`@localess/richtext`** — new framework-neutral rich text model and HTML renderer for Localess's TipTap JSON, with node/mark renderer overrides and shared fixtures. All framework packages render rich text through it.
- **`@localess/schema`** — new schema-as-code package: `defineEnum`, `defineSchema`, `defineConfig`, `toSchemaExport`, non-throwing `validate()`, and pure TypeScript content-type inference (`InferContent`, `InferContentData`, `InferEnum`). `OPTIONS` fields infer arrays of enum values and `SCHEMAS` fields accept by-value component references, both with matching validation rules. `defineField` is an optional per-field wrapper that catches a stray property from the wrong field kind at the call site.
- **`@localess/vue`** — new Vue 3 integration: `Localess` plugin, `LocalessComponent`, `LocalessDocument`, `LocalessRichText`, `useLocaless`/`useLocalessSync`/`useLocalessRichText` composables, `localessEditable`/`localessEditableField` helpers, a `@localess/vue/vite` plugin for component auto-registration, and a Nuxt playground.
- **`@localess/svelte`** — new Svelte 5 integration: `localessInit`/`getLocaless` context, `LocalessComponent`, `LocalessDocument`, `LocalessRichText`, `localessEditable` action, sync stores, and a SvelteKit playground. Built with `svelte-package` (ESM-only).
- **`@localess/astro`** — new Astro integration (Astro 6 and 7): `localess()` integration entry, native `.astro` components, component auto-registration from a `componentsDir`, `getLocalessClient`/`resolveAsset`/`getLivePayload` helpers, and Visual Editor live preview via reload. See [ADR 006](docs/decisions/006-astro-integration-architecture.md).
- `@localess/react`: `@localess/react/vite` and `@localess/react/vite/virtual-modules` entry points — a Vite plugin that automates Localess SSR integrations; `LocalessRichText` component; `AnyLocalessComponent` type; React Router and TanStack Start playgrounds (dynamic and static variants).
- `@localess/angular`: `[llComponent]` directive for non-wrapping dynamic component rendering, `LocalessDocument`, `LocalessRichText` component and rich text pipe, `SchemaComponent` base class (with `AnySchemaComponent`) for registered components, and `TransferState` hydration in `LocalessContentService` so the secret token never reaches browser network requests.
- `@localess/cli`: `schema pull|push|diff|validate` commands for syncing `@localess/schema` definitions with a Localess space; `translation diff` command; grouped diff output by status with an option to include unchanged entries (translations and schemas); pre-push previews that include unchanged keys; the pre-push diff is reconciled against the server's result and mismatches are reported as warnings.
- `playgrounds/schema` — minimal schema-as-code playground exercising `@localess/schema` and the CLI `schema` commands.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- **Breaking — `@localess/angular`:** single unified entry point. The `@localess/angular/browser` and `@localess/angular/server` entry points and their duplicated services are removed; configure everything through `provideLocaless({ origin, spaceId, token, ... })`, where the token type (public vs secret) follows the app's rendering mode. `LocalessContentService` methods now return Promises. The `LocalessComponent` wrapper component is replaced by the `[llComponent]` directive.
- **Breaking — `@localess/react`:** component-registration helper functions are replaced by a single `localessInit({ components, ... })`; `LocalessComponentProps` is renamed `LocalessSchemaProps`; the standalone `LocalessSync` helper is replaced by a live-edit cache with explicit output modes (`/rsc`, `/ssr`); the `enableSync` flag is removed from the locales configuration.
- **Breaking — `@localess/cli`:** command groups are now singular — `translation pull|push|diff` and `type generate` — with `translations` and `types` kept as aliases.
- **Breaking — shared types:** domain-model types formerly declared in `@localess/client` now live in `@localess/model` and are re-exported by `@localess/client` and every framework package's models barrel.
- `@localess/react`, `@localess/vue`, `@localess/svelte`: SSR documentation and playgrounds import `localessClient` from the framework package (`@localess/react/ssr`, `@localess/vue`, `@localess/svelte`) instead of `@localess/client` directly.
- `@localess/vue`: the `vLocalessEditable` directive is replaced by the `localessEditable` function.
- Every framework package routes its `@localess/client` imports through exactly three files (a models module, a utils module, and one client file) and its `@localess/richtext` imports through a designated richtext file — see each package's `CONTRIBUTING.md`. `@localess/astro` is not yet converted.
- Vite configs migrated to `.mts` and `import.meta.dirname`; `LocalessApiError` re-exported consistently across packages.
- Project documentation restructured under `docs/` (per-package references plus ADRs 005–009); `AGENTS.md` is now a redirect stub.

### Removed

- `@localess/react`: the Vite plugin for component auto-registration (the `/vite` entry point now serves SSR integration only).
- `@localess/angular`: `/browser` and `/server` entry points (see Changed).
- Unused OpenAPI specifications and a committed credentials file removed from playgrounds.

## [3.4.0] - 2026-08-09

> **Versioning note:** mid-development this range was briefly bumped to `3.4.1` (`b3bf314`) and then correctly rolled back to `3.4.0` (`1c5968b`) after more work landed on top of it — that rollback was intentional, not a mistake. `3.4.0` and `3.4.1` had only gone out as `-dev.*` snapshot prereleases before this; `3.3.0` was npm's `latest` until this release.

### Added

- `unpublish` and `leaveSchema` Visual Editor sync events.
- Comprehensive test coverage across all packages, wired into CI.
- `@localess/react`: `/ssr` export now provides its own `LocalessServerComponent` / `LocalessServerDocument` — a sync-free renderer and document wrapper split out of the `rsc`/`ssr` entry points (currently uncommitted working-tree changes).
- `@localess/client`: `LocalessApiError` for structured API error handling, with richer error messages/hints for 403 responses, network errors, and expired-token cases (with a link to token settings).
- `resolveAsset` and content-fetching methods gained an optional transform-parameters argument for building transformed asset URLs (client, react, angular).
- `@localess/cli`: `--verbose` option on commands for debug output.
- `@localess/angular`: unit tests for `ServerAssetService`, `ServerContentService`, and `ServerTranslationService`.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Refactored Visual Editor sync into a dedicated `LocalessSyncService` with simplified event subscription.
- `@localess/react` `SKILL.md` and `docs/react.md` updated to document the `/rsc` and `/ssr` export split and the `useLocaless` re-export.
- `@localess/angular`: dependencies bumped to v21.x; `@angular/platform-browser` added as a peer and regular dependency; `LocalessDocument` now accepts the full content object instead of separate props; tests migrated to Vitest with updated file naming conventions.
- Removed the unused `force` parameter from `loadLocalessSync`.
- Removed the `fileSystemCache` option.
- Documentation updated to reflect the Node.js `>= 24.0.0` requirement.

### Fixed

- CI test scripts now run once instead of in watch mode; `@localess/react` tests switched to `happy-dom`.
- Removed invalid `Buffer` casts and simplified mocks in `@localess/cli` session tests that were breaking the build.

## [3.3.0] - 2026-07-08

### Added

- `draft` flag support for pulling unpublished translations via the CLI.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Updated the TTL cache implementation; schema components now support assets.
- Updated Visual Editor sync handling in Localess components.

## [3.2.4] - 2026-06-11

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Replaced the `version` option on `translationsPullCommand` with a `draft` flag for clarity.
- Bumped the Node.js engine requirement to `>= 24.0.0`; updated `@types/node` and `vite` accordingly.

## [3.2.3] - 2026-06-11

### Added

- `version` option on `translationsPullCommand` / `getTranslations` to fetch draft vs. published content.

## [3.2.2] - 2026-06-09

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Refactored `loadLocalessSync`, streamlining its rejection conditions.

## [3.2.1] - 2026-06-09

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Refactored public API / index exports to use `export type` for clarity.

## [3.2.0] - 2026-05-31

### Added

- Optional transform parameters for asset URLs in `@localess/angular`.

## [3.1.0] - 2026-05-29

### Added

- `@localess/angular` package, with SSR support out of the box.
- Asset metadata and an `assets` interface on content and component props.

## [3.0.10] - 2026-05-20

### Added

- `publishConfig` (public access) to all packages.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- CI cleanup: removed redundant publish/build workflow steps.

## [3.0.9] - 2026-05-20

### Added

- `AssetTransformParams` type; `assetLink` / `resolveAsset` now support image transformations.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- CI migrated to `actions/checkout@v6` / `actions/setup-node@v6`; added dev-branch snapshot publish workflow.

## [3.0.8] - 2026-05-14

### Added

- CLI version check with dynamic version reporting.
- Version-bumping script and related npm scripts for lockstep releases.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Refactored the cache implementation, removing `FileSystemCache`.
- Refined the `version` type in client options.

## [3.0.7] - 2026-05-12

### Added

- File-system caching option (`cacheTTL`).
- `delete-missing` update strategy for translations.

## [3.0.6] - 2026-05-02

### Added

- `ensureGitignore` helper to automatically manage `.gitignore` entries.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Bumped `vite-plugin-dts` to 5.0.0 and removed the `orval` dependency.
- Bumped `@tiptap` dependencies to 3.22.5 and removed unused packages.

## [3.0.5] - 2026-04-28

### Added

- Sorting and flattening utilities for translation objects.

## [3.0.4] - 2026-04-27

### Added

- Tests for type generation.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Improved field sorting in the type generator.

## [3.0.3] - 2026-04-27

### Added

- `prefix` option for type generation, for customizable generated type names.

## [3.0.2] - 2026-04-26

### Added

- React hooks and utility functions.
- Server-side `LocalessDocument` component for React.
- `localess types generate` — schema-to-TypeScript-interface generation, including `_id` and `_schema` fields.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Normalized `origin` URLs (strip trailing slash).
- `loadLocalessSync` now returns a Promise, with improved error handling.
- `LocalessSync` accepts `origin` and `enableSync` props.

## [3.0.1] - 2026-03-23

### Added

- `SKILL.md` files documenting each package's API for AI coding agents.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Unified the npm publish process across packages.

## [3.0.0] - 2026-03-13

### Added

- `@localess/cli` package: `login` / `logout` commands, `localess types generate`, `localess translations pull` (with draft-version fetch) and `localess translations push` (with `--dry-run`), and automatic retry on failed API requests.

- **`@localess/client`** — caching is now pluggable and framework-aware:
  - `cache?: ICache<unknown>` replaces the built-in cache. `ICache` methods may now return promises,
    so a Redis- or KV-backed cache is expressible without wrapping. **No adapter ships with the
    SDK** — the interface is the deliverable, so the zero-dependency constraint holds.
  - `fetchInit?: { next?, cache? }` on the client and per call, merged into every `fetch`. This makes
    Next.js on-demand revalidation possible for the first time: `revalidateTag('localess:slug:home')`
    now works.
  - **Cache tags are generated** when `next` is set without explicit `tags` — `localess`,
    `localess:space:<id>`, and one of `localess:links` / `localess:content:<id>` /
    `localess:slug:<slug>` / `localess:translations:<locale>`. `localessCacheTags()` is exported so a
    webhook handler can produce the same strings.
  - **A request carrying `fetchInit` bypasses the client's own cache** — neither read nor written.
    Two caching layers over one call is how content survives a `revalidateTag()`.

### Changed

- Documentation and build tooling overhaul across all packages.

## [1.0.0] - 2026-01-29

Initial release of `@localess/client` and `@localess/react`.
