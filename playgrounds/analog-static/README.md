# Localess + AnalogJS (SSG / Static)

The static-prerender counterpart to the [`analog`](../analog) playground: the **same application code**, built with `static: true` so the build emits plain HTML and no server. Deploy `dist/analog/public/` to any static host.

Every file under `src/` is byte-identical to the `analog` playground — the entire difference is in `vite.config.ts`.

## What this demonstrates

- `@localess/angular` under a fully static AnalogJS deployment — content baked into HTML at build time, no request-time server
- **Build-time route enumeration** in `vite.config.ts`: `prerender.routes` accepts an async function, which queries `localessClient.getLinks()` for every document slug
- The integration-point contrast with the Angular CLI playground: `angular-static` enumerates routes via `getPrerenderParams()` *inside Angular's injector* using `LocalessContentService`, while Analog does it in the **Vite config — plain Node, no injector** — so it uses `@localess/client` directly
- Visual Editor sync still works, since Analog ships a live Angular app that hydrates the prerendered HTML

## How it differs from `analog`

| | `analog` | `analog-static` |
| --- | --- | --- |
| `analog()` plugin | `analog()` | `analog({ static: true, prerender: { routes } })` |
| Route discovery | per request | `localessClient.getLinks()` at build time |
| Output | `dist/analog/public` + Nitro server in `dist/analog/server` | `dist/analog/public` only |
| Serving | `node dist/analog/server/index.mjs` | any static file host |

`ssr` stays enabled — that is what renders the pages at build time. `static: true` only removes the runtime server.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To produce and check the static output:

```bash
npm run build     # writes dist/analog/public
npm run preview   # plain file server on http://localhost:4000
```

## Point it at your own Localess space

Edit `src/app/shared/utils/localess-config.ts` — replace `origin`, `spaceId`, and `token`. That module is imported by both `src/app/app.config.ts` (runtime) and `vite.config.ts` (build-time route enumeration), so the credentials live in exactly one place.

Because the app hydrates and fetches in the browser after the initial static HTML, the token ships in the JS bundle — use a **public read-only** token, never a secret one.

## Key files

| File | Shows |
| --- | --- |
| `vite.config.ts` | `static: true` + `prerender.routes` enumerating every locale × slug via `@localess/client` |
| `src/app/shared/utils/localess-config.ts` | Connection settings shared by app and build |
| `src/app/pages/[...slug].page.ts` | Catch-all file route, `routeMeta` resolver, `<ll-document>` |

## Learn more

- [Localess Angular docs](https://github.com/Lessify/localess-js/blob/main/docs/angular.md)
- [AnalogJS static site generation](https://analogjs.org/docs/features/server/static-site-generation)
