# Localess + Next.js (Static Export)

The static-export counterpart to the `next` playground: same content model, but built with `output: 'export'` in `next.config.ts`, so there's no request-time server. It uses `@localess/react/ssr` (`getLocalessClient`, `localessInit`, `LocalessServerDocument`) instead of `/rsc` — the RSC export needs a live server and isn't compatible with static export (see [docs/react.md](https://github.com/Lessify/localess-js/blob/main/docs/react.md)'s "Export Variants").

## What this demonstrates

- Fully static-exported Next.js app reading Localess content at **build time** — no live Visual Editor sync, since there's no server left once the HTML is baked
- Every locale pre-rendered via `generateStaticParams()` in `src/app/[[...path]]/page.tsx` — one static HTML file per locale, plus `/` for the default
- The same active-locale nav link + theme toggle UX patterns as the `next` playground, still purely client-side additions on top of the static HTML

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` to produce the static export in `out/`.

## Point it at your own Localess space

Edit the `localessInit(...)` call in `src/shared/utils/locales.ts` — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own. Because this build is static, the token is only ever read at build time, never shipped to the browser.

## Key files

| File | Shows |
| --- | --- |
| `src/shared/utils/locales.ts` | `localessInit()` from `@localess/react/ssr`, component registration |
| `src/app/[[...path]]/page.tsx` | `generateStaticParams()` enumerating every locale × slug combination |
| `src/shared/utils/route.ts` | `resolveLocaleAndSlug` |

## Learn more

- [Localess React docs — Static Rendering](https://github.com/Lessify/localess-js/blob/main/docs/react.md)
- [Next.js static export docs](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
