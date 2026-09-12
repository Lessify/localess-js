# Localess + Angular (SSG / Static)

The static-prerender counterpart to the `angular-ssr` playground: the **same application code**, built with `outputMode: "static"` so `ng build` emits plain HTML files instead of a Node server. Deploy `dist/angular-static/browser/` to any static host — S3, Firebase Hosting, Netlify, GitHub Pages, nginx.

See [docs/angular.md](https://github.com/Lessify/localess-js/blob/main/docs/angular.md) and [`@localess/angular`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/angular/SKILL.md) for the full API this playground exercises.

## What this demonstrates

- **`@localess/angular` under a fully static deployment** — no request-time server anywhere in the pipeline, content baked into HTML at build time
- **Build-time route enumeration** via `getPrerenderParams()` in `src/app/app.routes.server.ts`, which runs in Angular's injector context and so can call `LocalessContentService.links()` to discover every document slug in the space
- **Visual Editor sync still works.** Unlike a static-exported React app, Angular ships a live application to the browser, so `enableSync: true` and `<ll-document>` keep functioning against a static host — the prerendered HTML hydrates and then responds to editor `input`/`change` events as usual
- Everything the `angular-ssr` playground shows — `provideLocaless()` with `withLocalessComponents()` (eager + lazy), `[llComponent]`, `data-ll-*` targeting, locale-aware nav, dark-mode `ThemeService`

## How it differs from `angular-ssr`

The app source is identical except for one file. Only the build shape changes:

| | `angular-ssr` | `angular-static` |
| --- | --- | --- |
| `outputMode` (angular.json) | `"server"` | `"static"` |
| `ssr.entry` | `src/server.ts` | — (no `src/server.ts`, no `express`) |
| `app.routes.server.ts` | `RenderMode.Prerender`, no params | adds `getPrerenderParams()` + `PrerenderFallback.Client` |
| Output | `dist/.../browser` + `dist/.../server` | `dist/.../browser` only |
| Serving | `node dist/angular-ssr/server/server.mjs` | any static file host |

A static build has no request-time server, so every navigable URL needs its own HTML file — that's the whole reason `getPrerenderParams()` exists here. `PrerenderFallback.Client` means a document added to the CMS *after* the build still renders (client-side, via `index.csr.html`) instead of 404ing; point your host's 404 handler at `index.csr.html` to enable that.

## Run it

```bash
npm install
npm start
```

Open [http://localhost:4200](http://localhost:4200) — `ng serve` behaves the same as in the SSR playground.

To produce and check the static output:

```bash
npm run build        # writes dist/angular-static/browser
npm run serve:static # plain file server on http://localhost:4000
```

The build prints `Prerendered N static routes` and writes `dist/angular-static/prerendered-routes.json` listing them.

## Point it at your own Localess space

The `provideLocaless({...})` call in `src/app/app.config.ts` is pre-filled with a **public read-only token** against a shared demo space (`https://demo.localess.org`). Replace `origin`, `spaceId`, and `token` with your own space's values.

Because a static build has no server, the app fetches from Localess in the browser after hydration, which means the token ships in the JS bundle. Use a **public token** here — never a secret one.

## Key files

| File | Shows |
| --- | --- |
| `src/app/app.routes.server.ts` | `getPrerenderParams()` enumerating every locale × slug from `LocalessContentService.links()` |
| `angular.json` | `outputMode: "static"` with a `server` entry for prerendering, and no `ssr.entry` |
| `src/app/app.config.ts` | `provideLocaless()`, `withLocalessComponents()` |
| `src/app/app.routes.ts` | Route resolver calling `LocalessContentService.contentBySlug()` and handling `LocalessApiError` 404s |
| `src/app/slug/slug.component.html` | `<ll-document>` usage |
| `src/app/shared/utils/route.ts` | `resolveLocaleAndSlug` — the same locale/slug split the prerender params mirror |

## Learn more

- [Localess Angular docs](https://github.com/Lessify/localess-js/blob/main/docs/angular.md)
- [Angular prerendering (SSG) docs](https://angular.dev/guide/prerendering)
