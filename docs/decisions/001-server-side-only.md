# ADR 001: @localess/client Is Server-Side Only

## Context

`@localess/client` authenticates every API request with a secret API token (`token` option). This token grants read/write access to a Localess space. Applications need to keep it out of browser bundles.

Additionally, the SDK requires Node.js >= 24. It uses the native `fetch` API and does not polyfill browser environment differences.

## Decision

`@localess/client` is a server-side-only library. It must never be imported in:
- React Client Components (`'use client'`)
- Browser entry points
- Any code that ships to the client bundle

For React apps, always fetch Localess data in Server Components, `getServerSideProps`, API routes, or other server-side contexts, then pass the result as props to client components.

## Consequences

**For contributors:**
- Never suggest `@localess/client` usage in client-side code, even in examples.
- Do not use `window`, `document`, `localStorage`, or other browser globals anywhere in `packages/client/`.
- `@localess/react` exports `useLocaless` hook and `LocalessDocument` component for client-side usage — these are the correct client-side primitives; they do not expose the token.

**For API design:**
- New methods added to `LocalessClient` interface may use Node.js built-ins freely.
- Token is always included as a query parameter on the server — never persisted client-side.
