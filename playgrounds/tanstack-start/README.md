# Localess + TanStack Start (SSR)

[TanStack Start](https://tanstack.com/start) with file-based routing, rendering [Localess](https://github.com/Lessify/localess) content through `@localess/react`'s Vite plugin.

## What this demonstrates

- `localess()` from `@localess/react/vite` in `vite.config.ts`, alongside `tanstackStart()` — automates `localessInit()` and component registration for this Vite-based SSR framework
- A server function (`getPageContent`, see `src/shared/server/` or the route's `loader`) fetching CMS content, called from the root/catch-all route
- Active-locale detection via `useLocation()` + `resolveLocaleAndSlug()` in `src/routes/__root.tsx`, driving both an active-locale nav link and a light/dark theme toggle (`src/components/theme-toggle.tsx`) — UX patterns on top of the SDK, not part of its API

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (port fixed in `vite.config.ts`'s `dev` script).

## Point it at your own Localess space

Edit the `localess({...})` options in `vite.config.ts` — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own.

> `localess()`'s `token` option is bundled into the client — there's no public/secret token split for this plugin yet. Treat it as a public value (see the "Known gap" note in [`@localess/react`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/react/SKILL.md)).

## Key files

| File | Shows |
| --- | --- |
| `vite.config.ts` | `localess()` plugin setup |
| `src/routes/__root.tsx` | Active-locale detection, nav links, theme toggle |
| `src/routes/$.tsx` | Catch-all route resolving a CMS slug |
| `src/shared/utils/route.ts` | `resolveLocaleAndSlug` |

## Learn more

- [Localess React docs — Vite Plugin for SSR Frameworks](https://github.com/Lessify/localess-js/blob/main/docs/react.md)
- [TanStack Start docs](https://tanstack.com/start)
