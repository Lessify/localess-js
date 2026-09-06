# ADR 013 — `@localess/live-preview` as a separate package

**Status:** Accepted
**Date:** 2026-09-06
**Applies to:** `@localess/live-preview`, `@localess/client`, and every framework package

## Context

Visual Editor support lived inside `@localess/client` — a package whose entire documented purpose is
server-side content delivery (ADR 001).

- `sync.ts` created a `<script>` element and appended it to `document.head`.
- `editable.ts` returned `data-ll-*` DOM attributes.
- The `EventToApp` union and `LocalessSync` interface described a browser bridge.
- `platform.util.ts` existed only to gate that browser code.

All browser-only, in a package declared server-side-only — to the point that `loadLocalessSync`
guarded against its own package's premise with an `isServer()` early return.

Separately, and more expensively: react, vue, and svelte each carried a module-level
`_enableSync` / `_syncPromise` pair plus byte-identical `isSyncEnabled`, `localessSyncOn`, and
`localessSyncOnChange` implementations. Three copies of the same thirty lines.

### The objection worth answering

The natural objection is that live preview *depends on client configuration* — it needs the origin
URL to load the sync script from — so it belongs with the client.

That is true of the *feature* and false of the *code*. `loadLocalessSync(origin)` takes the origin as
a plain string argument; it never reads a config object. All six framework packages already passed
`options.origin` explicitly. `editable.ts` needed nothing at all. So the coupling was incidental —
callers happened to have the origin to hand because they were initialising the client in the same
breath.

## Decision

Extract `@localess/live-preview`, depending on `@localess/model` alone. `origin` stays an explicit
parameter.

The package owns:

- `loadLocalessSync(origin)` — script injection, shared load promise
- `localessEditable`, `localessEditableField` — `data-ll-*` attributes
- `EventToApp`, `EventToAppOf`, `EventToAppType`, `EventCallback`, `LocalessSync` — the bridge contract
- `isBrowser`, `isServer`, `isIframe` — the environment gate
- `createSyncController()` — the state and subscription logic the framework packages duplicated

`@localess/client` re-exports the moved symbols, marked `@deprecated`, so no consumer import breaks.
That re-export is the one compromise: the implementation has left the client, but the client's public
surface still mentions it until a future major removes it.

### Why a controller factory, not module state

React's App Router bundles Server and Client Components into separate module graphs. A shared
singleton in `@localess/live-preview` would be wrong there — each graph needs its own instance,
which is exactly why `isSyncConfigured()` exists in the React package. `createSyncController()`
returns an independent instance per caller.

### Why not npm-distribute the sync script (the Storyblok approach)

`@storyblok/live-preview` is the same extraction, and their loader needs no configuration because
the bridge is an npm package (`@storyblok/preview-bridge`) they dynamically `import()`. Their code
still carries a comment noting it "matches the original CDN script behaviour" — they migrated off a
per-tenant URL. Sanity does the same with `@sanity/visual-editing`.

That fix does not transfer. Storyblok and Sanity each run **one** backend version. Localess is
**self-hosted**, so serving `sync-v1.js` from the deployment's own origin is what guarantees the
bridge matches the server the app is actually talking to. npm-distributing it would introduce a
version-skew failure mode neither competitor has: a consumer pinning `@localess/live-preview@2`
against a server speaking v1.

Doing it anyway would require a version handshake over `postMessage`, with a defined fallback. That
is a separate item and needs a design spec first.

## Consequences

- **Rule 4 gains a fifth root-dependant edge.** `@localess/live-preview` depends on
  `@localess/model`; `@localess/client` depends on `@localess/model` and `@localess/live-preview`;
  every framework package depends on it too. No sibling-to-sibling edge is created.
- **`@localess/client` keeps deprecated re-exports.** ADR 001's contradiction is resolved in
  substance — no browser code in the client's source — but not yet in its public API.
- **Tests got stronger, not just relocated.** The framework packages had been faking the Visual
  Editor by mocking client's re-exported `isIframe`. That mock no longer reaches the check, which
  now lives inside this package, so the tests were rewritten to fake the environment for real
  (`window.top` spy) and to dispatch actual script `load`/`error` events. Several had been asserting
  against a stubbed boolean rather than the code path.
- **`loadLocalessSync` gained an `@internal` `resetSyncForTest()`.** Its load promise is
  module-level on purpose — there is only one script — which means it outlives a test. Without a
  reset, a later test silently takes the already-loaded early return instead of the path it means
  to exercise.
