# Localess + React Router v7 (SSR)

[React Router v7](https://reactrouter.com/) in framework mode (`ssr: true`), rendering [Localess](https://github.com/Lessify/localess) content through `@localess/react`'s Vite plugin. TailwindCSS for styling.

## What this demonstrates

- `localess()` from `@localess/react/vite` in `vite.config.ts` — replaces a hand-written `localessInit()` call with a Vite plugin that wires up initialization and component auto-registration for both the SSR and client module graphs
- A catch-all route (`app/routes/catch-all.tsx`) resolving any CMS slug through a loader
- An active-locale nav link indicator and light/dark theme toggle (`app/components/theme-toggle.tsx`) in `app/root.tsx` — UX patterns built on the SDK, not part of its API

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (Vite's default is `http://localhost:5173`).

## Point it at your own Localess space

Edit the `localess({...})` options in `vite.config.ts` — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own.

> `localess()`'s `token` option is bundled into the client — there's no public/secret token split for this plugin yet. Treat it as a public value (see the "Known gap" note in [`@localess/react`'s SKILL.md](https://github.com/Lessify/localess-js/blob/main/packages/react/SKILL.md)).

## Key files

| File | Shows |
| --- | --- |
| `vite.config.ts` | `localess()` plugin setup, `componentsDir` + explicit `components` map |
| `app/routes/catch-all.tsx` | Loader-based slug resolution and rendering |
| `app/shared/utils/route.ts` | `resolveLocaleAndSlug` |
| `app/root.tsx` | Active-locale nav links + theme toggle |

## Learn more

- [Localess React docs — Vite Plugin for SSR Frameworks](https://github.com/Lessify/localess-js/blob/main/docs/react.md)
- [React Router docs](https://reactrouter.com/)
