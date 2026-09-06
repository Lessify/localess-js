# @localess/live-preview

Browser-side Visual Editor support, extracted from `@localess/client` (which is server-side only).
Depends on `@localess/model` alone.

If you use a framework package (`@localess/react`, `/vue`, `/svelte`, `/angular`, `/astro`,
`/nuxt`), you do **not** need to install this — they depend on it and re-export what you need.

## Editable attributes

```ts
import { localessEditable, localessEditableField } from '@localess/live-preview';

localessEditable(data)            // { 'data-ll-id', 'data-ll-schema' }
localessEditableField<T>('title') // { 'data-ll-field' }
```

Spread these onto the elements the editor should be able to select. No configuration needed.

## Sync script

```ts
loadLocalessSync(origin: string): Promise<void>
```

`origin` is an explicit argument, not read from configuration. The script is served by the Localess
deployment itself (`<origin>/scripts/sync-v1.js`), so it is always version-matched to the server the
app talks to — which is why this package needs no config object and no `@localess/client`.

No-ops outside a browser and outside the Visual Editor iframe. Concurrent callers share one load.

## Sync controller

```ts
const sync = createSyncController();
sync.init(origin, enableSync);   // records the flag, starts loading when enabled
sync.isEnabled();                // enabled AND in a browser AND framed
sync.isConfigured();             // the raw flag, ungated
sync.ready();                    // resolves when loaded, or immediately
sync.on(event, cb);              // no-op unless usable
sync.onChange(cb);
```

A factory, not module state: React's App Router bundles Server and Client Components into separate
module graphs, and each needs its own instance — which is what `isConfigured()` is for.

## Environment

```ts
isBrowser(); isServer(); isIframe();
```

`isIframe()` is the Visual Editor gate — sync is only meaningful inside the editor's frame.

## Events

`EventToApp` covers `save`, `publish`, `unpublish`, `pong`, `input`, `change`, `enterSchema`,
`hoverSchema`, `leaveSchema`. `EventToAppOf<T>` narrows the callback payload, so subscribing to
`'input' | 'change'` types `event.data`. `LocalessSync` is the `window.localess` contract.

## Testing

`resetSyncForTest()` is `@internal` and clears the shared load promise. That promise is
module-level on purpose — there is only one script — so it outlives a test, and without a reset a
later test silently takes the already-loaded early return instead of the path it means to exercise.

Fake the editor environment for real rather than mocking a re-export: spy on `window.top` so
`isIframe()` is true, then dispatch `load`/`error` on the injected `#localess-js-sync` element.
