# ADR 001: @localess/client Is Server-Side Only (Secret Tokens), With a Public-Token Exception

## Context

`@localess/client` authenticates every API request with an API token (`token` option). Historically, every token granted read/write access to a Localess space — a **secret token** — so applications needed to keep it out of browser bundles entirely.

Localess now also issues **public tokens**: read-only, scoped to published content and translations only (no draft/preview access, no write access). A public token is safe to embed in client-side code — the same trust model as Storyblok's public CDN access token, and the reason `docs/decisions/006-astro-integration-architecture.md` previously contrasted the two (`@localess/client`'s token is a secret, unlike Storyblok's public CDN access token) no longer fully holds for the public-token case.

Additionally, the SDK requires Node.js >= 24. It uses the native `fetch` API and does not polyfill browser environment differences — this remains true regardless of token type, and is a separate reason `@localess/client` itself is not meant to run in a browser at all (see below).

## Decision

`@localess/client` itself remains a server-side-only library, regardless of token type — it must never be imported in React Client Components, browser entry points, or any code that ships to the client bundle. This is unchanged: it targets Node.js's `fetch`, not browser `fetch`, and nothing about the public-token exception below changes that.

**What changes:** a **secret token** must never be exposed client-side, full stop. A **public token** (read-only, published content and translations only) is safe to use client-side — but only through a framework package's client-side primitives, never by importing `@localess/client` directly in the browser.

**Currently, this exception is implemented in `@localess/react` only.** Its `LocalessClientDocument` fallback (used under Next.js `output: 'export'`, where no Server Action can run) calls `localessInit()` a second time from a Client Component boundary, using a public token, to populate the client-side component registry and enable Visual Editor sync there. `@localess/angular`, `@localess/cli`, and `@localess/astro` have not been reworked to take public tokens into account yet — until they are, treat their token as secret-only, and do not suggest client-side `localessInit`-equivalent calls for them.

**Known, deliberate, temporary violation — `@localess/react/vite`'s `localessVite()` plugin.** `vite-plugin-localess-init.ts` currently ships the single `token` it's given to *both* the SSR graph and the client bundle, unconditionally — there is no secret/public split for this plugin (a prior `publicToken` option/no-op-without-it design was removed). This was a conscious maintainer decision to unblock Vite SSR-framework playgrounds (TanStack Start, React Router v7) rather than an oversight; it is tracked as debt, not precedent. Do not extend this pattern to `@localess/angular`, `@localess/cli`, or `@localess/astro`, and do not treat it as license to relax the "never suggest passing a secret token client-side" rule elsewhere — it applies narrowly to this one plugin until a real public/scoped-token mechanism replaces it.

For React apps otherwise, always fetch Localess data in Server Components, `getServerSideProps`, API routes, or other server-side contexts (using the secret token), then pass the result as props to client components. The public-token exception is specifically for the registry/sync bootstrapping problem, not a general invitation to fetch content client-side with a secret token.

**Exception — the browser-safe utility surface.** A small set of exports carry no token and are safe (and meant) to run in the browser: `isBrowser`, `isIframe`, `loadLocalessSync`, `localessEditable`, `localessEditableField`, and the sync event types (`LocalessSync`, `EventToApp`, `EventCallback`, `EventToAppType`). These exist in `@localess/client` because they're the framework-agnostic primitives every SDK (`@localess/react`, `@localess/angular`, `@localess/astro`) needs identically — duplicating them per-framework would be the real inconsistency. Framework packages re-export them as-is rather than reimplementing them.

## Consequences

**For contributors:**
- Never suggest `@localess/client` usage in client-side code, even in examples — the public-token exception is implemented via `@localess/react`'s own `localessInit`, not by importing `@localess/client` directly in the browser.
- Never suggest passing a secret token client-side, in any package, for any reason.
- Do not use `window`, `document`, `localStorage`, or other browser globals anywhere in `packages/client/`, **except** inside the browser-safe utility surface named above (`sync.ts`, `editable.ts`, `utils/`) — those files exist specifically to be called from the browser.
- `@localess/react` exports `useLocaless` hook and `LocalessDocument` component for client-side usage — these are the correct client-side primitives; they do not expose a secret token. Its `LocalessClientDocument` fallback additionally accepts a public token via a second `localessInit()` call, specifically for `output: 'export'`.
- Before suggesting a public-token pattern for `@localess/angular`, `@localess/cli`, or `@localess/astro`, confirm that package has actually been reworked for it — don't assume parity with `@localess/react` just because this ADR now describes the concept generally.

**For API design:**
- New methods added to `LocalessClient` interface may use Node.js built-ins freely.
- `@localess/client`'s `token` option is untyped as to secret-vs-public — that distinction lives entirely in which token the caller was issued and where they choose to use it, not in the SDK. `@localess/client` does not attempt to detect or enforce which kind of token it was given.
- A secret token is always included as a query parameter on the server — never persisted client-side. A public token, when used client-side per the exception above, is expected to appear in client-side network requests; that's what makes it public.
