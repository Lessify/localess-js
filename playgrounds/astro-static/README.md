# Localess + Astro (Static Output)

The static-output counterpart to the `astro` playground: `output: 'static'`-equivalent build (build-time content fetch, static prerender) instead of the `server` adapter, using the same `@localess/astro` integration.

## What this demonstrates

- The same `localess({...})` integration as `astro`, but with Astro's default **static output** (no `output: 'server'`) — content is fetched and pages are rendered at build time
- `livePreview` is intentionally left off here — it requires `output: 'server'`. Under static output, `enableSync` (reload-based, not `livePreview`'s live patch) is the option to reach for instead — see the comment in `astro.config.mjs`
- The same catch-all routing, rich text rendering, and locale/theme-toggle UX as the SSR variant, now baked into static HTML at build

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (Astro's default is `http://localhost:4321`). Run `npm run build` to produce the static site.

## Point it at your own Localess space

Edit the `localess({...})` options in `astro.config.mjs` — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own. Since this is a static build, the token is only ever read at build time.

## Key files

| File | Shows |
| --- | --- |
| `astro.config.mjs` | `localess()` integration setup |
| `src/shared/utils/route.ts` | `resolveLocaleAndSlug` |
| `src/layouts/Layout.astro` | Theme toggle, locale nav links |
| `src/components/localess/` | Registered schema components |

Generate CMS-driven TypeScript types for your own schemas with:

```bash
npm run localess:login
npm run localess:types
```

## Learn more

- [Localess Astro docs](https://github.com/Lessify/localess-js/blob/main/docs/astro.md)
- [Astro docs](https://docs.astro.build/)
