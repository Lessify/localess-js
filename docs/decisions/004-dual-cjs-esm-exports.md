# ADR 004: Dual CJS + ESM Package Exports

## Context

The JavaScript ecosystem is mid-migration from CommonJS (CJS) to ES Modules (ESM). Different consumers need different formats:

- **Next.js App Router** (React Server Components) requires ESM-compatible packages.
- **Legacy tooling** (older webpack configs, Jest without ESM transform, `require()` calls) expects CJS.
- **TypeScript consumers** need `.d.ts` type declarations regardless of module format.

Publishing only ESM breaks legacy tooling. Publishing only CJS breaks Next.js App Router.

## Decision

`@localess/client` and `@localess/react` publish both formats from the same source via Vite library mode (`vite.config.mts`) with `vite-plugin-dts`:

```ts
// vite.config.mts
build: {
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    formats: ['es', 'cjs'],
    fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
  },
},
```

Output:
- `dist/index.js` — CJS (`require()`)
- `dist/index.mjs` — ESM (`import`)
- `dist/index.d.ts` — TypeScript types

`package.json` uses the `exports` field to route consumers to the correct file:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
}
```

`@localess/cli` is ESM-only (`formats: ['es']`, single `index.mjs` output) because it is a CLI executable, not a library — its `package.json` `exports`/`main`/`bin` all point to `dist/index.mjs` with no CJS fallback.

`@localess/angular` is out of scope for this ADR — it builds with ng-packagr (Angular CLI) following the Angular Package Format, not Vite, and is ESM-only per Angular's own conventions.

*Update:* the same dual-format Vite setup now also covers `@localess/model`, `@localess/richtext`, `@localess/live-preview`, `@localess/schema`, `@localess/vue`, and `@localess/astro`. Two more packages are ESM-only: `@localess/svelte` (`svelte-package`) and `@localess/nuxt` (`@nuxt/module-builder`, see [ADR 011](011-nuxt-module-depends-on-vue.md)).

## Consequences

**For contributors:**
- Never add a new package entry point without adding a corresponding `exports` entry in `package.json`.
- Do not use CJS-only patterns (`__dirname`, `require.resolve`) in `@localess/client` or `@localess/react` source — use `import.meta.url` or ESM equivalents instead.
- The `main` field in `package.json` points to the CJS output (or, for `@localess/cli`, the ESM output) as a fallback for tooling that doesn't read `exports`.
