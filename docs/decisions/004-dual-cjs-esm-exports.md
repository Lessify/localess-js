# ADR 004: Dual CJS + ESM Package Exports

## Context

The JavaScript ecosystem is mid-migration from CommonJS (CJS) to ES Modules (ESM). Different consumers need different formats:

- **Next.js App Router** (React Server Components) requires ESM-compatible packages.
- **Legacy tooling** (older webpack configs, Jest without ESM transform, `require()` calls) expects CJS.
- **TypeScript consumers** need `.d.ts` type declarations regardless of module format.

Publishing only ESM breaks legacy tooling. Publishing only CJS breaks Next.js App Router.

## Decision

All packages (`@localess/client`, `@localess/react`) publish both formats from the same source via `tsup`:

```
tsup src/index.ts --format cjs,esm --dts
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

`@localess/cli` is ESM-only (`--format esm --shims`) because it is a CLI executable, not a library.

## Consequences

**For contributors:**
- Never add a new package entry point without adding a corresponding `exports` entry in `package.json`.
- Do not use CJS-only patterns (`__dirname`, `require.resolve`) in `@localess/client` or `@localess/react` source — use `import.meta.url` or ESM equivalents instead.
- `@localess/cli` uses `--shims` in its tsup build to polyfill `__dirname` and `__filename` for Node.js CLI compatibility.
- The `main` field in `package.json` points to the CJS output as a fallback for very old tooling.
