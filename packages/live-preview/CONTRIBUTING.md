# Contributing to `@localess/live-preview`

Browser-side Visual Editor bridge. Read `docs/decisions/013-live-preview-package.md` first — it
explains why this is a package rather than part of `@localess/client`, and why the origin is a
parameter rather than configuration.

## Layout

```
src/
  platform.ts         isBrowser / isServer / isIframe — the editor-frame gate
  sync.ts             loadLocalessSync(origin) + @internal resetSyncForTest
  sync-controller.ts  createSyncController() — state + subscriptions
  editable.ts         data-ll-* attributes
  events.ts           EventToApp union, LocalessSync, window augmentation
```

## Hard rules

- **Exactly one `dependencies` entry: `@localess/model`.** No `@localess/client` — that is the whole
  point of the package. No external npm dependencies.
- **No `node:*` imports.** Must run in browsers, Node, and edge runtimes.
- **`origin` stays a parameter.** Do not introduce a config object or a module-level origin. A
  caller always has the origin; taking it as an argument is what keeps this package free of the
  client.
- **`createSyncController` stays a factory.** Module-level state breaks React's split Server/Client
  module graphs.

## Adding to the event union

`EventToApp` mirrors what the Localess Studio sync script actually emits. Adding a variant here
without the platform sending it produces a type that cannot occur. Check
`localess/src/app/.../sync` before extending it, and add the variant to `EventToAppType` too or
`EventToAppOf` cannot narrow it.

## Testing

```bash
npm test --workspace=@localess/live-preview
npm run build --workspace=@localess/live-preview
```

Environment-dependent behaviour must be faked at the environment level — spy on `window.top` for the
iframe check and dispatch real `load`/`error` events on `#localess-js-sync`. Mocking a re-export of
`isIframe` from a consuming package does **not** reach the check inside this package; several
framework tests were doing exactly that and were asserting on a stubbed boolean instead of the code
path. Call `resetSyncForTest()` in `afterEach`.
