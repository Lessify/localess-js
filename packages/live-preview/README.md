<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/live-preview

The framework-neutral bridge between your app and the [Localess](https://github.com/Lessify/localess) Visual Editor: it loads the sync script, marks elements as editable, and delivers editor events so a page re-renders as an author types.

Every framework package (`@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, `@localess/astro`) builds its live-editing support on this package and re-exports the parts you need, so **you usually don't install it directly**. Reach for it when you're integrating a framework we don't ship, or wiring the Visual Editor into something custom.

**Zero external dependencies** — `@localess/model` is the only entry in `dependencies`. See [ADR 013](../../docs/decisions/013-live-preview-package.md).

## Requirements

- Node.js >= 24.0.0

## Installation

```bash
# npm
npm install @localess/live-preview

# yarn
yarn add @localess/live-preview

# pnpm
pnpm add @localess/live-preview
```

---

## Marking content editable

The Visual Editor maps a click in the preview back to a block using two data attributes. `localessEditable()` produces them from any content block, and `localessEditableField()` marks an individual field:

```ts
import { localessEditable, localessEditableField } from '@localess/live-preview';

localessEditable(data);
// → { 'data-ll-id': '9cf406ab-…', 'data-ll-schema': 'Page' }

localessEditableField<Page>('title');
// → { 'data-ll-field': 'title' }
```

Both return plain attribute objects, so they spread into whatever your framework uses — `{...localessEditable(data)}` in JSX and Astro, `v-bind` in Vue, `use:`/spread in Svelte.

`localessEditableField<T>` is typed against your content type and excludes `_id`/`_schema`, so a typo or a non-field key is a compile error rather than an attribute the editor silently ignores.

---

## Receiving editor events

`createSyncController()` returns an independent controller that loads the sync script and manages subscriptions:

```ts
import { createSyncController } from '@localess/live-preview';

const sync = createSyncController();

// Once, at startup. A load failure is logged, never thrown — the app still works without live editing.
sync.init(origin, enableSync);

await sync.ready();

sync.onChange(event => {
  // Fired on `change` and `input` — re-render with event.data
});

sync.on(['save', 'publish', 'unpublish'], event => {
  // Refetch, revalidate, whatever your framework needs
});
```

| Member | Purpose |
|---|---|
| `init(origin, enableSync)` | Records the flag and starts loading the script when enabled |
| `isEnabled()` | `true` only when sync is on **and** usable here — in a browser, inside the editor iframe. Callers need no further environment checks |
| `isConfigured()` | The raw flag without the browser/iframe gating, for passing down from a server component |
| `ready()` | Resolves once the script has loaded, or immediately when sync is off |
| `on(event, cb)` | Subscribe to one or more editor events. No-op when sync is unusable |
| `onChange(cb)` | Subscribe to `change` and `input` |

**Events:** `input`, `change`, `save`, `publish`, `unpublish`, `enterSchema`, `hoverSchema`, `leaveSchema`, `pong`.

### Why a factory, not a singleton

`createSyncController()` is deliberately a factory. React's App Router bundles Server and Client Components into **separate module graphs**, so each graph needs its own instance — a module-level singleton would be wrong in exactly the environment where live editing matters most.

If you only need the script loaded and nothing else, `loadLocalessSync(origin)` does that on its own and is safe to call more than once.

---

## Environment helpers

```ts
import { isBrowser, isIframe, isServer } from '@localess/live-preview';

isBrowser(); // typeof window !== 'undefined'
isServer();  // typeof window === 'undefined'
isIframe();  // in a browser, and not the top-level window
```

Live editing is only meaningful when the page is running inside the Visual Editor's iframe, which is what `isIframe()` establishes and what `isEnabled()` folds in for you.

---

## Related

- [`@localess/model`](../model) — the content types these helpers are typed against
- [docs/live-preview.md](../../docs/live-preview.md) — full reference
- Framework integrations: [react](../react), [angular](../angular), [vue](../vue), [svelte](../svelte), [astro](../astro)

## License

See the [Localess](https://github.com/Lessify/localess) repository.
