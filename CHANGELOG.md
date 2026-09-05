# Changelog

All notable changes to the Localess JavaScript/TypeScript SDKs (`@localess/model`, `@localess/client`, `@localess/richtext`, `@localess/schema`, `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro`, `@localess/cli`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows lockstep [Semantic Versioning](https://semver.org/) — all packages share the same version number.

> This file was reconstructed from git history on 2026-08-09, the first time a changelog was introduced into the project. Entries are grouped by the version-bump commits already present in history; purely internal commits (CI tweaks, formatting, the Next.js example app under `apps/`) are generally omitted unless they affect consumers.

## [Unreleased]

### Changed

- **BREAKING** — the API no longer returns raw `assets`/`links`/`references` **id arrays** on
  documents inside a `references` map. Those arrays are a denormalized index of edges that already
  exist in `data` — a `REFERENCE` field value is `{ kind: 'REFERENCE', uri }` — so they were
  redundant on the wire, and the top-level document already stripped them. Resolved references are
  now consistent with it.

  `References` stays `Record<string, Content>` — no new type. A resolved reference is simply a
  `Content` whose three collection fields are absent.

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

### Changed

- Updated the TTL cache implementation; schema components now support assets.
- Updated Visual Editor sync handling in Localess components.

## [3.2.4] - 2026-06-11

### Changed

- Replaced the `version` option on `translationsPullCommand` with a `draft` flag for clarity.
- Bumped the Node.js engine requirement to `>= 24.0.0`; updated `@types/node` and `vite` accordingly.

## [3.2.3] - 2026-06-11

### Added

- `version` option on `translationsPullCommand` / `getTranslations` to fetch draft vs. published content.

## [3.2.2] - 2026-06-09

### Changed

- Refactored `loadLocalessSync`, streamlining its rejection conditions.

## [3.2.1] - 2026-06-09

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

### Changed

- CI cleanup: removed redundant publish/build workflow steps.

## [3.0.9] - 2026-05-20

### Added

- `AssetTransformParams` type; `assetLink` / `resolveAsset` now support image transformations.

### Changed

- CI migrated to `actions/checkout@v6` / `actions/setup-node@v6`; added dev-branch snapshot publish workflow.

## [3.0.8] - 2026-05-14

### Added

- CLI version check with dynamic version reporting.
- Version-bumping script and related npm scripts for lockstep releases.

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

### Changed

- Bumped `vite-plugin-dts` to 5.0.0 and removed the `orval` dependency.
- Bumped `@tiptap` dependencies to 3.22.5 and removed unused packages.

## [3.0.5] - 2026-04-28

### Added

- Sorting and flattening utilities for translation objects.

## [3.0.4] - 2026-04-27

### Added

- Tests for type generation.

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

### Changed

- Normalized `origin` URLs (strip trailing slash).
- `loadLocalessSync` now returns a Promise, with improved error handling.
- `LocalessSync` accepts `origin` and `enableSync` props.

## [3.0.1] - 2026-03-23

### Added

- `SKILL.md` files documenting each package's API for AI coding agents.

### Changed

- Unified the npm publish process across packages.

## [3.0.0] - 2026-03-13

### Added

- `@localess/cli` package: `login` / `logout` commands, `localess types generate`, `localess translations pull` (with draft-version fetch) and `localess translations push` (with `--dry-run`), and automatic retry on failed API requests.

### Changed

- Documentation and build tooling overhaul across all packages.

## [1.0.0] - 2026-01-29

Initial release of `@localess/client` and `@localess/react`.
