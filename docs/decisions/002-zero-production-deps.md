# ADR 002: @localess/client Has Zero Production Dependencies

## Context

SDK packages that ship runtime dependencies impose those dependencies on every consumer. This creates version conflict risk (consumer uses `axios@1`, SDK requires `axios@2`), increases bundle size, and adds indirect maintenance burden.

`@localess/client` needs only HTTP fetching (native `fetch` in Node >= 18) and in-memory caching (a simple Map with TTL). Both are implementable with zero external code.

## Decision

`packages/client/package.json` has an empty `dependencies` field. All build tooling (`tsup`, `typescript`) lives in `devDependencies` and is not shipped.

This is a deliberate constraint, not an oversight. Do not add runtime dependencies to resolve convenience problems.

## Consequences

**For contributors:**
- Implement any new functionality with Node.js built-ins or code written in the package itself.
- If a compelling external library is needed, raise it for discussion first — the bar is high.
- `devDependencies` (build tools, type definitions) are fine and not affected by this rule.

**For consumers:**
- Installing `@localess/client` adds no transitive dependencies to their project.
- The package works in any Node.js >= 20 environment without polyfills or peer dependencies.
