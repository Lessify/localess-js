# Localess + TanStack Start (Static Prerendering)

The static-prerendering counterpart to the `tanstack-start` playground: `prerender.pages` in `vite.config.ts` builds the whole site to static HTML instead of serving it per-request.

## What this demonstrates

- The "two client instances" pattern documented in [docs/react.md](https://github.com/Lessify/localess-js/blob/main/docs/react.md): path enumeration for `prerender.pages` runs as plain Node before any Vite module graph exists, so it builds a **second, standalone client** via `localessClient` from `@localess/react/ssr`, separate from the `localessVite()`-managed client used for actual page rendering — this is expected, not a bug to dedupe
- Same active-locale detection (`src/routes/__root.tsx`, `src/shared/utils/route.ts`) and theme toggle as the SSR variant, now baked into static HTML

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` to produce the static site.

## Point it at your own Localess space

Update the Localess config in `vite.config.ts` (`localessVite({...})`, used for the build) and wherever `prerender.pages` builds its standalone `localessClient` for path enumeration. Replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) in both places with your own.

## Key files

| File | Shows |
| --- | --- |
| `vite.config.ts` | `localessVite()` plugin setup + `prerender.pages` path enumeration |
| `src/routes/__root.tsx` | Active-locale detection, nav links, theme toggle |
| `src/routes/$.tsx` | Static catch-all route |
| `src/shared/utils/route.ts` | `resolveLocaleAndSlug` |

## Learn more

- [Localess React docs — Static Prerendering: Two Client Instances Are Expected](https://github.com/Lessify/localess-js/blob/main/docs/react.md)
