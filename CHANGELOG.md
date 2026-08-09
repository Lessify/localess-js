# Changelog

All notable changes to the Localess JavaScript/TypeScript SDKs (`@localess/client`, `@localess/react`, `@localess/angular`, `@localess/cli`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows lockstep [Semantic Versioning](https://semver.org/) — all four packages share the same version number.

> This file was reconstructed from git history on 2026-08-09, the first time a changelog was introduced into the project. Entries are grouped by the version-bump commits already present in history; purely internal commits (CI tweaks, formatting, the Next.js example app under `apps/`) are generally omitted unless they affect consumers.

## [Unreleased]

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
