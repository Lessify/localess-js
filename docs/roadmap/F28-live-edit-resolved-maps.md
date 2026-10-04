# F28 — Live edits carry resolved links, references and assets

**Status:** Backlog (not started) · **Spans:** SDK (this repo) + platform (`localess`, same F-number)
**Recorded:** 2026-10-04, from the platform ↔ SDK sync audit.

## Problem

A document fetched with `resolveLink` / `resolveReference` / `resolveAsset` carries three lookup maps
beside `data`: `links` (id → `ContentMetadata`, used by `findLink()`), `references` (id → referenced
document) and `assets` (id → `AssetMetadata`: `alt`, `width`, `height`, …).

Visual Editor live edits send only `data`. The editor's `input` / `change` events are
`{ type, documentId, data }` (platform `edit-document.component.ts:639, 645, 658`), and the sync
script forwards them unchanged. Every SDK swaps in the new `data` but keeps the maps from the
original fetch:

- React / Vue / Svelte / Angular `LocalessDocument` pass `document.links/references/assets` from page
  load (e.g. `packages/react/src/core/components/localess-document.tsx:63-76`).
- Astro `livePreview` re-renders server-side with the posted `data` only
  (`packages/astro/src/live-preview/middleware.ts:28-29`, `src/lib/helpers.ts:35-38`).

So anything **added or changed** in the editor is missing from the maps:

| Editor action | Preview result |
|---|---|
| link text to another document | `findLink` → `/not-found` |
| pick a reference | `references[uri]` is `undefined` — empty render, or a throw if unguarded |
| pick a new image | image shows, but no `alt` / dimensions |

Astro `livePreview` recovers on `save` (it reloads). React / Vue / Svelte / Angular do not refetch on
`save`, so the maps stay stale until the preview is reloaded by hand.

The app usually can't resolve the ids itself in the browser: `@localess/client` is server-side only
and only some setups have a public token. Only the editor knows, at edit time, what was just picked.

## Proposal

**A. The editor sends the maps with each live edit.** Extend the event, all fields optional so older
SDKs ignore them:

```ts
{ type: 'input' | 'change'; documentId: string; data: unknown; links?: Links; references?: References; assets?: Assets }
```

In two steps:

1. **`links` and `assets`.** Cheap for the editor (document metadata is in memory; asset pickers
   already load each asset) and fixes the most visible symptoms.
2. **`references`.** The editor runs `extractContent` for the selected locale on each referenced
   document its pickers already load. One level deep, matching the API.

SDK work (this repo):

- `@localess/live-preview`: add the optional fields to `EventToApp`; `onDocument` already passes the
  whole event to callbacks.
- `LocalessDocument` in React (`/core`, `/rsc`), Vue, Svelte, Angular: merge event maps over the
  fetched ones (`{ ...document.links, ...event.links }`), keeping them for subsequent edits.
- Astro `livePreview`: POST the maps with `data`; the middleware exposes them through
  `getLivePayload`.
- Tests per framework; SKILL.md + `docs/live-preview.md` and each framework doc.

**B. Follow-up, independent of A:** `LocalessDocument` in React / Vue / Svelte / Angular refreshes on
`save` (refetch or the framework's refresh hook), so even without A the preview is correct after Save.
Needs a browser-side fetch path not every setup has, so it complements A rather than replacing it.

## Out of scope

- References inside references (the API resolves one level only).
- Any new platform endpoint — the editor already holds everything needed.
