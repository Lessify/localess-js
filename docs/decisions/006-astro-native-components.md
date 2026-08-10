# ADR 006: @localess/astro Ships Native Components, Not a React Adapter

## Context

Astro supports two integration styles for a CMS SDK: (a) native `.astro` components with zero UI-framework dependency, or (b) a thin adapter on top of `@localess/react` for apps that already installed Astro's React integration.

## Decision

`@localess/astro` ships native `.astro` components. It has no dependency on React, Vue, Svelte, or any other UI framework — only `@localess/client`.

A React-adapter approach would force a React dependency onto every Astro user, including those using Vue, Svelte, Solid, or no framework at all — which cuts against why people choose Astro. Native components keep the package as dependency-free as `@localess/client`/`@localess/react` already are, and match Astro's own philosophy of shipping minimal client JS by default.

This also means `@localess/astro` needs only **one entry point** (`@localess/astro`), unlike `@localess/react`'s three (`@localess/react`, `/ssr`, `/rsc`). React's split exists to manage what crosses the Server/Client Component module-graph boundary in React Server Components — a concept that doesn't exist in Astro, where `.astro` components are server-rendered by default with no such boundary.

## Visual Editor sync: reload, not live-patch

`@localess/astro`'s Visual Editor sync (`LocalessSync`) reloads the page (debounced) on any edit event, rather than patching the live DOM. `@storyblok/astro` was reviewed as prior art: its default behavior is the same reload-on-change; it also offers an **experimental** tier using a debounced POST-and-`morphdom`-patch approach for `input` events, which requires SSR output, a request-intercepting middleware, and a new dependency (`morphdom`). That tier is deliberately **not** adopted here — real value, but out of scope for this version. A future ADR/design should revisit it once the reload-based version has shipped and been used.

## Consequences

**For contributors:**
- Never suggest wrapping `@storyblok/astro`-style Astro Integration API (`astro.config.mjs` hooks, Vite virtual modules, filesystem-convention component auto-import, dev-toolbar apps) into `@localess/astro` without a new design discussion — this package is intentionally a plain library (`localessInit()` + explicit registry), matching `@localess/client`/`@localess/react`'s pattern, not a full Astro Integration.
- `LocalessComponent`, `LocalessDocument`, `LocalessSync` are `.astro` files and must be imported via their dedicated subpath exports (`@localess/astro/LocalessComponent.astro`, etc.) as default exports — never add them to `index.ts`, it doesn't work.
- A hand-rolled mock object is not a valid `AstroComponentFactory` for tests — Astro's renderer checks `Component.isAstroComponentFactory === true`, which only the `.astro` compiler sets. Use a real fixture `.astro` file under `src/components/__fixtures__/` instead.
