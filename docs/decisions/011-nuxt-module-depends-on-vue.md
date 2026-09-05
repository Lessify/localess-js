# ADR 011 — `@localess/nuxt` depends on `@localess/vue`

**Status:** Accepted
**Date:** 2026-09-05
**Applies to:** `@localess/nuxt`, and rule 4 in `CLAUDE.md`

## Context

Rule 4 in `CLAUDE.md` has said, since ADR 005, that **dependent packages never depend on each
other**. `@localess/react`, `@localess/angular`, `@localess/vue`, `@localess/svelte`, and
`@localess/astro` are siblings: each depends only on the roots, never on another integration. That
rule exists so a consumer installing one framework package never drags in a second framework's
runtime, and so a change to one integration cannot break another.

`@localess/nuxt` (F07) cannot satisfy it. Nuxt *is* Vue. A Nuxt module that did not reuse
`@localess/vue` would have to re-implement the plugin, the injection key, the components, the rich
text renderer, and the sync composables — a second copy of an integration that already exists, with
its own drift.

## Decision

`@localess/nuxt` depends on `@localess/vue`, and rule 4 is amended to name this as its one
exception.

The exception is narrow and stated as a rule rather than a precedent:

> A framework package may depend on another framework package **only** when it is a
> host-framework-specific wrapper around it — i.e. the dependency is a strict superset relationship
> (Nuxt is Vue), not a shared-utility relationship. Anything shared by siblings belongs in a root
> package instead.

Under that rule, `@localess/nuxt → @localess/vue` is allowed. A hypothetical
`@localess/react → @localess/vue` would not be, nor would `@localess/svelte` importing a helper from
`@localess/react` — that helper would go to `@localess/model`, `@localess/richtext`, or
`@localess/client`.

This is the same shape Storyblok uses: `@storyblok/nuxt` has exactly one dependency,
`@storyblok/vue`.

### Why not the alternatives

- **Nuxt support inside `@localess/vue`.** Puts `nuxt` in the peer dependencies of a package that
  plain-Vue users install, and pulls `@nuxt/kit` into its build. Rejected in the F07 task file for
  this reason.
- **A `@localess/vue/nuxt` subpath export.** A Nuxt module needs its own `module.mjs` entry and
  `@nuxt/module-builder`; that tooling would leak into `@localess/vue`'s Vite build.
- **Duplicating the Vue integration.** The thing the rule exists to prevent, achieved by obeying the
  rule literally.

## Consequences

- **The zero-dependency roots are untouched.** ADR 002 constrains `@localess/model`,
  `@localess/client`, `@localess/richtext`, and `@localess/schema` only. `@localess/nuxt` is a
  framework integration and may take external dependencies; it takes `@nuxt/kit` and
  `@localess/vue`.
- **`@localess/nuxt` inherits `@localess/vue`'s public API.** A breaking change in the Vue package is
  a breaking change here. Rule 5 (upstream check) now has a second hop: a change to
  `@localess/client`'s surface may reach `@localess/nuxt` through `@localess/vue`.
- **Build tooling differs again.** `@nuxt/module-builder`, not Vite library mode — a third exception
  alongside `@localess/svelte` (`svelte-package`) and `@localess/angular` (ng-packagr). Noted in
  `docs/index.md`.
- **The rule is now conditional, so it must be read before adding any cross-package import.** The
  test is "is this a host-framework wrapper?", not "does it happen to be convenient?"

## Note on the token split

Not a package-boundary decision, but the other thing about this module that is easy to get wrong,
recorded here because it is the same *kind* of load-bearing constraint.

Nuxt feeds one config object to two runtimes. `@storyblok/nuxt` has a single `accessToken` plus a
boolean `enableServerClient`, and when that boolean is false — **its default** — the token is written
to `runtimeConfig.public`, i.e. into the client bundle. One name, whose secrecy depends on a flag
declared elsewhere.

`@localess/nuxt` uses two names instead: `token` (public → `runtimeConfig.public.localess`) and
`serverToken` (secret → `runtimeConfig.localess`). The module never relocates a token based on a
mode flag, so no single boolean can move a secret into the browser. This upholds rule 2 in
`CLAUDE.md`, and is asserted by tests in `packages/nuxt/src/module.setup.test.ts` that fail if
`serverToken` ever appears under `runtimeConfig.public`.
