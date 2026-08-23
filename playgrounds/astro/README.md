# Localess + Astro (SSR)

An Astro app in `server` output mode, rendering [Localess](https://github.com/Lessify/localess) content via the `@localess/astro` integration. See [docs/astro.md](https://github.com/Lessify/localess-js/blob/main/docs/astro.md) and [`@localess/astro`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/astro/SKILL.md) for the full API this playground exercises.

## What this demonstrates

- The `localess({...})` integration registered in `astro.config.mjs`, with `componentsDir` auto-discovery and `enableFallbackComponent`
- A `[...path]` catch-all route resolving any CMS slug per-request
- Live Visual Editor preview (`livePreview: true`) via the integration's dev-toolbar app and middleware
- Rich text rendering (`richtext-test.astro`)
- Locale-aware routing and a light/dark theme toggle wired up in `src/layouts/Layout.astro` — UX patterns on top of the integration, not part of its API

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (Astro's default is `http://localhost:4321`). Run `npm run build && npm start` to try the built Node server.

## Point it at your own Localess space

Edit the `localess({...})` options in `astro.config.mjs` — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own.

## Key files

| File | Shows |
| --- | --- |
| `astro.config.mjs` | `localess()` integration setup |
| `src/shared/utils/route.ts` | `resolveLocaleAndSlug` |
| `src/layouts/Layout.astro` | Theme toggle, locale nav links |
| `src/pages/richtext-test.astro` | Rich text rendering |
| `src/shared/components/localess/` | Registered schema components |

Generate CMS-driven TypeScript types for your own schemas with:

```bash
npm run localess:login
npm run localess:types
```

## Learn more

- [Localess Astro docs](https://github.com/Lessify/localess-js/blob/main/docs/astro.md)
- [Astro docs](https://docs.astro.build/)
