# Localess + SvelteKit (SSR)

[SvelteKit](https://svelte.dev/docs/kit) rendering [Localess](https://github.com/Lessify/localess) content through `@localess/svelte`. TailwindCSS for styling.

## What this demonstrates

- Server-side fetching with `@localess/client` directly in a `+page.server.ts` `load()` function (`src/routes/[...slug]/+page.server.ts`), using a **secret** token — SvelteKit guarantees `.server.ts` files never reach the client bundle
- `localessInit()` called once in the root `src/routes/+layout.svelte`, with a **public** token, to enable Visual Editor live sync on top of the server-fetched content
- `<LocalessDocument>` picking up live `input`/`change` events automatically once `enableSync` is on
- A catch-all route (`src/routes/[...slug]/+page.server.ts`) resolving any CMS slug, returning SvelteKit's built-in 404 (`src/routes/+error.svelte`) when the content doesn't exist
- An active-locale nav link indicator and light/dark theme toggle (`src/lib/ThemeToggle.svelte`) in the root layout — UX patterns built on the SDK, not part of its API. The toggle defers reading `localStorage`/`prefers-color-scheme` to a post-mount `$effect`, since `window` isn't available during SSR

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (`https://localhost:5173` by default — self-signed cert, via `@vitejs/plugin-basic-ssl`).

## Point it at your own Localess space

Edit the `localessClient({...})` options in `src/routes/[...slug]/+page.server.ts` (secret token) and the `localessInit({...})` options in `src/routes/+layout.svelte` (public token) — replace `origin`, `spaceId`, and `token` (pre-filled against a shared public demo space) with your own.

## Key files

| File | Shows |
| --- | --- |
| `src/routes/[...slug]/+page.server.ts` | Server-side fetch with a secret token, locale/slug resolution, 404 handling |
| `src/routes/+layout.svelte` | `localessInit()` with a public token, component registration, active-locale nav + theme toggle |
| `src/routes/[...slug]/+page.svelte` | `<LocalessDocument>` for live-synced rendering |
| `src/lib/route.ts` | `resolveLocaleAndSlug` |

## Learn more

- [Localess Svelte docs](https://github.com/Lessify/localess-js/blob/main/docs/svelte.md)
- [SvelteKit docs](https://svelte.dev/docs/kit)
