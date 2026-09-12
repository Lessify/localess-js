# Localess + AnalogJS (SSR)

An [AnalogJS](https://analogjs.org) application — the Angular meta-framework powered by Vite — rendering [Localess](https://github.com/Lessify/localess) content via `@localess/angular`. Server-rendered through Analog's Nitro server.

Its static counterpart is [`../analog-static`](../analog-static), whose application code is **byte-identical**; only `vite.config.ts` differs. See [docs/angular.md](https://github.com/Lessify/localess-js/blob/main/docs/angular.md) and [`@localess/angular`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/angular/SKILL.md) for the full API.

## What this demonstrates

- `@localess/angular` running under a **Vite + Nitro** build pipeline rather than the Angular CLI — the same `provideLocaless()` setup works unchanged
- Analog's **file-based routing**: `src/app/pages/[...slug].page.ts` is a catch-all route with a default-exported standalone component
- Data fetching through Analog's `routeMeta` **resolver**, calling `LocalessContentService.contentBySlug()` — so server→browser `TransferState` hydration and Visual Editor sync keep working exactly as in the Angular CLI playgrounds
- `withLocalessComponents()` schema-to-component mapping (eager `Page`, lazy `Button`) and `<ll-document>` with `data-ll-*` Visual Editor targeting

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

For the production SSR build:

```bash
npm run build     # dist/analog/public (client) + dist/analog/server (Nitro)
npm run preview   # node dist/analog/server/index.mjs
```

## Point it at your own Localess space

Edit `src/app/shared/utils/localess-config.ts` — replace `origin`, `spaceId`, and `token` (pre-filled with a **public read-only** token against a shared demo space). The rest of the options live in `provideLocaless()` in `src/app/app.config.ts`.

## Key files

| File | Shows |
| --- | --- |
| `src/app/pages/[...slug].page.ts` | Catch-all file route, `routeMeta` resolver, `<ll-document>` |
| `src/app/app.config.ts` | `provideFileRouter()` alongside `provideLocaless()` / `withLocalessComponents()` |
| `src/app/shared/utils/localess-config.ts` | Connection settings, shared with the static playground's build step |
| `src/app/shared/utils/route.ts` | `resolveLocaleAndSlug` + `segmentsFromUrl` |
| `vite.config.ts` | Analog plugin, plus the monorepo-only `@localess/angular` alias |

## Two things worth knowing

**Resolvers must read `state.url`, not `route.url`.** For Analog's catch-all route, `ActivatedRouteSnapshot.url` and `.params` are both empty — the matched segments are only on the `RouterStateSnapshot`. That's what `segmentsFromUrl(state.url)` is for.

**Analog also offers `.server.ts` `load` functions** (read with `injectLoad`), which run server-only and would let you use a *secret* token that never reaches the browser. This playground deliberately uses a route resolver instead, so the Localess usage stays identical to the Angular CLI playgrounds and keeps `TransferState` hydration. See [Analog's data-fetching docs](https://analogjs.org/docs/features/data-fetching/server-side-data-fetching).

## Monorepo note

`vite.config.ts` aliases `@localess/angular` to `../../packages/angular/dist`, with a matching `paths` entry in `tsconfig.json`. An app installing `@localess/angular` from npm needs neither.

## Learn more

- [Localess Angular docs](https://github.com/Lessify/localess-js/blob/main/docs/angular.md)
- [AnalogJS docs](https://analogjs.org/docs)
