# Localess + Nuxt (SSR)

[Nuxt](https://nuxt.com/) rendering [Localess](https://github.com/Lessify/localess) content through `@localess/vue`. TailwindCSS for styling.

## What this demonstrates

- Server-side fetching with `@localess/client` directly in `server/api/content.ts`, using a **secret** token — Nuxt guarantees `server/` files never reach the client bundle
- `Localess` plugin installed once (`app/plugins/localess.client.ts`), with a **public** token, to enable Visual Editor live sync on top of the server-fetched content
- `<LocalessDocument>` picking up live `input`/`change` events automatically once `enableSync` is on
- A catch-all page (`app/pages/[...slug].vue`) resolving any CMS slug, returning Nuxt's built-in error page (`createError`) when the content doesn't exist
- An active-locale nav link indicator and light/dark theme toggle (`app/components/theme-toggle.vue`) in the root layout — UX patterns built on the SDK, not part of its API. The toggle defers reading `localStorage`/`prefers-color-scheme` to `onMounted`, since `window` isn't available during SSR

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (Vite's default is `http://localhost:3000`).

## Point it at your own Localess space

Edit the `localessClient({...})` options in `server/api/content.ts` (secret token) and the `Localess` plugin options in `app/plugins/localess.client.ts` (public token) — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own.

## Key files

| File | Shows |
| --- | --- |
| `server/api/content.ts` | Server-side fetch with a secret token, locale/slug resolution, 404 handling |
| `app/plugins/localess.client.ts` | `Localess` plugin install with a public token, component registration |
| `app/app.vue` | Active-locale nav + theme toggle |
| `app/pages/[...slug].vue` | `<LocalessDocument>` for live-synced rendering |
| `shared/utils/route.ts` | `resolveLocaleAndSlug` |

## Learn more

- [Localess Vue docs](https://github.com/Lessify/localess-js/blob/main/docs/vue.md)
- [Nuxt docs](https://nuxt.com/docs)
