# ADR 012 — Component naming strategies

**Status:** Accepted
**Date:** 2026-09-05
**Applies to:** `@localess/react`, `@localess/vue`, `@localess/nuxt`, `@localess/astro`

## Context

A Localess schema can be named anything — `Page`, `hero-banner`, `hero_banner`. Every frontend
framework has its own file-naming convention, and they disagree: React and Svelte favour
`HeroBanner.tsx`, Angular favours `hero-banner`, Vue accepts either. So the schema name and the
component filename are chosen by different people under different conventions, and the SDK has to
match them.

Four packages scan a directory and build a component registry. They had **three different
answers**:

| Package | Registry key | Lookup key |
|---|---|---|
| `@localess/astro` | `toCamelCase(filename)` | `toCamelCase(data._schema)` |
| `@localess/react` | filename verbatim + kebab alias | `data._schema` raw |
| `@localess/vue` | filename verbatim + kebab alias | `data._schema` raw |
| `@localess/nuxt` | filename verbatim + kebab alias | `data._schema` raw |

Astro's is the only one that actually works in general: normalizing *both* sides matches any
spelling, whereas generating aliases only matches the spellings the SDK happens to enumerate. A
schema named `hero_banner` resolved `HeroBanner.astro` and failed against `HeroBanner.vue`.

The alias approach in react/vue/nuxt was itself a same-day fix for a worse bug — those plugins keyed
purely by *kebab-cased* filename while lookup used `_schema` verbatim, so a `PascalCase` schema
matched nothing at all.

## Decision

One shared, configurable strategy, applied to **both sides** of the comparison.

`normalizeComponentKey(name, naming)` lives in `@localess/client` — which already hosts the
cross-framework helpers (`localessEditable`, `isBrowser`, `loadLocalessSync`), is depended on by
every framework package, and has zero external dependencies. Each package re-exports it through its
own `models`/`utils` barrel per rule 7.

Built-in strategies:

| Strategy | `HeroBanner` / `hero-banner` / `hero_banner` -> |
|---|---|
| `exact` | unchanged — matches only an identical spelling |
| `camelCase` | `heroBanner` |
| `PascalCase` | `HeroBanner` |
| `kebab-case` | `hero-banner` |
| `snake_case` | `hero_banner` |
| `lowercase` | `herobanner` — separators dropped entirely |

Plus a custom `(name: string) => string`, except in `@localess/astro` and `@localess/nuxt`, whose
options are serialized (`JSON.stringify` into a virtual module, and `runtimeConfig` respectively) and
so cannot carry a function. Those two accept the strategy names only, enforced by their types.

### Why `exact` is the default

The alternative was `camelCase`, which would have been zero-churn — it is what Astro already did and
a superset of what react/vue/nuxt did.

`exact` was chosen instead because it is predictable: the registry key is exactly what you see in the
file listing, a lookup either matches or it does not, and there is no hidden transformation to reason
about when a component fails to resolve. Case-folding strategies are opt-in for teams whose schema
names and file names genuinely diverge.

The cost is a **breaking change for `@localess/astro`**, which always matched through camelCase.
Recorded below.

### Why normalization is applied at lookup, not at registration

Both sides could be normalized when the registry is built. Doing it at lookup instead means the
registry keeps the original keys (filenames as written, user-supplied `components` keys as written),
so:

- the strategy is configured in **one** place — the init/integration options — rather than having to
  agree between a build-time plugin and a runtime call;
- error messages and debugging show the key the developer actually wrote;
- changing strategy does not require regenerating the registry.

The normalized index is built once per `localessInit`, not per lookup.

### Where the option is exposed

The *mechanism* has to live at lookup time, which is core (`getComponent` normalizes
`data._schema`). The *option* belongs wherever a directory is scanned, because that is the only place
the mismatch arises — filenames chosen under a framework convention versus schema names chosen in
Localess. With a hand-written registry the consumer picks both sides and can simply use the schema
name as the key.

So:

**The rule: whatever generates the registry owns the naming.** In every case that is the
directory-scanning integration, and in no case is it the runtime init call.

| Package | Option lives on | Applied by |
|---|---|---|
| `@localess/react` | `@localess/react/vite`'s `localess({ componentsDir, componentNaming })` | the generated `virtual:localess-components` registry |
| `@localess/vue` | `@localess/vue/vite`'s `localess({ componentsDir, componentNaming })` | the generated `virtual:localess-vue-components` registry |
| `@localess/nuxt` | `nuxt.config.ts`'s `localess` block | the generated `localess-components.mjs` template |
| `@localess/astro` | the integration options | the generated registry + `LocalessComponent.astro` |

Neither `localessInit()` (React) nor the `Localess` plugin (Vue) accepts `componentNaming`, and it
never reaches Nuxt's `runtimeConfig`. `getComponent` in both React and Vue is an unchanged plain
`Object.hasOwn` lookup.

The asymmetry between React and Vue is not an oversight: it follows from whether the framework's
plugin owns the registry the consumer passes in.

An earlier iteration put `componentNaming` on the runtime init options of both React and Vue. That
worked, but it left a knob on the core API that a consumer with a hand-written `components` map
should never touch — they choose the keys on both sides, so there is nothing to reconcile. It was
removed from both.

Instead, when a non-`exact` strategy is configured, the generated registry resolves keys through the
strategy itself. Under the default `exact` no wrapper is emitted, so the common case is an ordinary
object. Nuxt does the same in the template its module generates, which is why `componentNaming` is
build-time there and absent from `runtimeConfig`.

The wrapper must implement `getOwnPropertyDescriptor`, not just `has` — `Object.hasOwn` is how the
registry is probed, and it consults the former. Getting that wrong reports *missing* components as
present, which is a silent failure.

### Collisions

Under anything but `exact`, `HeroBanner.vue` and `hero-banner.vue` in one directory collapse to one
key. `createComponentIndex` reports collisions; the framework packages log a warning naming both
keys and keep the first registration. It is always a configuration mistake — two components cannot
both answer to one schema — but warning rather than throwing avoids breaking an app at runtime over
a component that may never be rendered.

## Consequences

- **Breaking: `@localess/astro`'s default changed from camelCase to `exact`.** An Astro app whose
  filenames differ in case from its schema names will stop resolving those components. The fix is one
  line: `componentNaming: 'camelCase'`. `toCamelCase()` is still exported (now implemented on
  `normalizeComponentKey`) and marked deprecated.
- **`@localess/astro` no longer needs the `camelcase` npm package.**
- **The verbatim+kebab aliasing in the react and vue Vite plugins is gone.** Registry keys are the
  filename, full stop. Anything relying on the kebab alias should set `componentNaming: 'kebab-case'`
  or `'camelCase'`.
- **`@localess/svelte` and `@localess/angular` are unchanged.** They take a manually-supplied registry
  and do not scan a directory, so there is no filename convention to reconcile. Extending strategies
  to them is a separate decision.
- A custom naming function is applied to **both** sides, so it must be written to converge — a
  function that only ever adds a prefix will not match, because the registry key gets the prefix too.

## Alternatives rejected

- **Build-time aliases only.** No runtime change, smaller diff, but it cannot match a spelling that
  was not enumerated, and it would have left Astro on a different mechanism from the other three.
- **`lowercase` as the default.** The highest match rate out of the box, but the registry key becomes
  hard to predict and two reasonably-named components can silently collide.
- **Normalizing at registration.** Would require the build-time plugin and the runtime lookup to be
  configured with the same strategy independently, which is a drift bug waiting to happen.
