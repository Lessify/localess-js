# Contributing to @localess/model

Shared domain-model types. **Zero dependencies** — `package.json` has no
`dependencies` key at all, and that is load-bearing (ADR 002, ADR 009):
`@localess/client`, `@localess/richtext`, `@localess/schema`, every
framework package, and `@localess/cli` all depend on this package, so it
must never depend on any of them (or on anything else).

## Module map

One file per type (kebab-case, matching the type name), each with a single
responsibility, plus `src/index.ts` as the only barrel. See `docs/model.md`
for the full type list.

## Adding a new shared model

1. Add `src/<kebab-case-name>.ts` with the interface/type and JSDoc on every
   public field.
2. Export it from `src/index.ts`.
3. Add a construction smoke test to `src/index.test.ts` (one `it()` block
   constructing a valid value and asserting one field — these types have no
   runtime logic, so the test exists only as a regression trip-wire for the
   shape itself).
4. Add a row to the type table in `docs/model.md`.
5. If the type is meant to replace a duplicate that exists elsewhere in the
   repo (the usual reason to add something here), update that package to
   import from `@localess/model` instead and delete its local copy — don't
   leave both.

## What does NOT belong here

- Anything with runtime behavior (classes, functions) — this package is
  types only. `LocalessApiError`, for example, stays in `@localess/client`.
- Types specific to one package's internal implementation (e.g. CLI command
  option types, framework component prop types) — only genuinely
  cross-package wire/domain shapes belong here.
