# Localess + React Router v7 (Static Prerendering)

The static-prerendering counterpart to the `react-router` playground: `ssr: false` with an explicit `prerender()` path list in `react-router.config.ts`, so the whole site is built to static HTML.

## What this demonstrates

- The "two client instances" pattern documented in [docs/react.md](https://github.com/Lessify/localess-js/blob/main/docs/react.md): `react-router.config.ts`'s `prerender()` runs as plain Node, before any Vite module graph exists, so it can't reach the `localess()`-managed `localessInit()` singleton. It builds a **second, standalone client** via `localessClient` from `@localess/react/ssr` purely to enumerate every locale × slug path to prerender — this is expected, not a bug to dedupe
- The same `localess()` setup as `react-router` for the actual page rendering at build time
- Same active-locale nav link + theme toggle UX as the SSR variant, now baked into static HTML

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal. Run `npm run build` to produce the static site.

## Point it at your own Localess space

Both places need updating — they use independent clients:

1. `vite.config.ts` — the `localess({...})` options used for the actual build
2. `react-router.config.ts` — the standalone `localessClient({...})` used only to enumerate prerender paths

Replace `origin`, `spaceId`, and `token` in both (pre-filled against a shared public demo space) with your own.

## Key files

| File | Shows |
| --- | --- |
| `react-router.config.ts` | Standalone `localessClient` for `prerender()` path enumeration |
| `vite.config.ts` | `localess()` plugin setup for the build itself |
| `app/routes/catch-all.tsx` | Static route rendering |
| `app/shared/utils/route.ts` | `resolveLocaleAndSlug` |

## Learn more

- [Localess React docs — Static Prerendering: Two Client Instances Are Expected](https://github.com/Lessify/localess-js/blob/main/docs/react.md)
