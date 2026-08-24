# Localess + Next.js (App Router / RSC)

A [Next.js](https://nextjs.org) App Router app rendering [Localess](https://github.com/Lessify/localess) content via `@localess/react/rsc`. Bootstrapped with `create-next-app`; see [docs/react.md](https://github.com/Lessify/localess-js/blob/main/docs/react.md) and [`@localess/react`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/react/SKILL.md) for the full API this playground exercises.

## What this demonstrates

- Server/Client component split with `@localess/react/rsc` — `localessInit()` in `app/layout.tsx`, content fetched in a Server Component, live sync handled by `LocalessDocument`
- A `[[...path]]` catch-all page (`src/app/[[...path]]/page.tsx`) resolving any CMS slug, including the root `/` as `home`
- Locale-prefixed routing with an active-locale nav link indicator and a light/dark theme toggle (`src/components/theme-toggle.tsx`) — these two are plain UX patterns built on top of the SDK, not part of its public API
- A schema component registry under `src/components/localess/`

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Point it at your own Localess space

The Localess config in `src/shared/utils/locales.ts` (`localessInit(...)`) is pre-filled with a public read-only token against a shared demo space (`https://demo.localess.org`). Replace `origin`, `spaceId`, and `token` there with your own space's values to use your own content. Since this app renders via RSC, the token is read server-side only — see the security note in [docs/client.md](https://github.com/Lessify/localess-js/blob/main/docs/client.md).

## Key files

| File | Shows |
| --- | --- |
| `src/shared/utils/locales.ts` | `localessInit()`, component registration, supported locale list |
| `src/app/[[...path]]/page.tsx` | Catch-all routing + slug resolution |
| `src/shared/utils/route.ts` | `resolveLocaleAndSlug` — splitting a path into locale + CMS slug |
| `src/components/localess/page.tsx` | A registered schema component |
| `src/components/theme-toggle.tsx` | Dark-mode toggle (not an SDK feature) |

## Learn more

- [Localess React docs](https://github.com/Lessify/localess-js/blob/main/docs/react.md)
- [Next.js Documentation](https://nextjs.org/docs)
