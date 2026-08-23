# Localess + Angular (SSR)

An Angular SSR application rendering [Localess](https://github.com/Lessify/localess) content via `@localess/angular`. See [docs/angular.md](https://github.com/Lessify/localess-js/blob/main/docs/angular.md) and [`@localess/angular`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/angular/SKILL.md) for the full API this playground exercises.

## What this demonstrates

- A single `provideLocaless()` registration in `src/app/app.config.ts` with `withLocalessComponents()` for schema-to-component mapping (eager and lazy-loaded)
- Dynamic schema rendering via the `[llComponent]` directive and `<ll-document>`, with `data-ll-id` / `data-ll-schema` / `data-ll-field` attributes for Visual Editor targeting
- `LocalessContentService`'s automatic server→browser `TransferState` hydration — content fetched once on the server is reused on the client without a duplicate request
- Active-locale detection via a `Router`-driven signal and active-locale nav link classes, plus a signal-based dark-mode `ThemeService` (`src/app/shared/services/theme.service.ts`) — both are UX patterns built on top of the SDK, not part of its public API

## Run it

```bash
npm install
npm start
```

Open [http://localhost:4200](http://localhost:4200). For the SSR build: `npm run build` then `npm run serve:ssr`.

## Point it at your own Localess space

The `provideLocaless({...})` call in `src/app/app.config.ts` is pre-filled with a public read-only token against a shared demo space (`https://demo.localess.org`). Replace `origin`, `spaceId`, and `token` with your own space's values.

## Key files

| File | Shows |
| --- | --- |
| `src/app/app.config.ts` | `provideLocaless()`, `withLocalessComponents()` |
| `src/app/app.component.ts` | Active-locale signal derived from `Router` events |
| `src/app/app.component.html` | Active-locale nav link classes, `<ll-document>` usage |
| `src/app/shared/utils/route.ts` | `resolveLocaleAndSlug` |
| `src/app/shared/services/theme.service.ts` | Dark-mode toggle (not an SDK feature) |
| `src/app/shared/components/localess/page/page.component.ts` | A registered schema component |

## Learn more

- [Localess Angular docs](https://github.com/Lessify/localess-js/blob/main/docs/angular.md)
- [Angular SSR docs](https://angular.dev/guide/ssr)
