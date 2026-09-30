# ADR 002: @localess/client Has Zero Production Dependencies

## Context

SDK packages that ship runtime dependencies impose those dependencies on every consumer. This creates version conflict risk (consumer uses `axios@1`, SDK requires `axios@2`), increases bundle size, and adds indirect maintenance burden.

`@localess/client` needs only HTTP fetching (native `fetch`, available since Node 18, required at >= 24) and in-memory caching (a simple Map with TTL). Both are implementable with zero external code.

## Decision

`packages/client/package.json` has an empty `dependencies` field. All build tooling (`vite`, `vite-plugin-dts`, `typescript`) lives in `devDependencies` and is not shipped.

This is a deliberate constraint, not an oversight. Do not add runtime dependencies to resolve convenience problems.

*Update:* `dependencies` is no longer empty — it now holds exactly two internal, zero-dependency workspace packages, `@localess/model` ([ADR 009](009-shared-model-package.md)) and `@localess/live-preview` ([ADR 013](013-live-preview-package.md)). The zero-*external*-dependency constraint is unchanged.

## Consequences

**For contributors:**
- Implement any new functionality with Node.js built-ins or code written in the package itself.
- If a compelling external library is needed, raise it for discussion first — the bar is high.
- `devDependencies` (build tools, type definitions) are fine and not affected by this rule.

**For consumers:**
- Installing `@localess/client` adds no transitive dependencies to their project.
- The package works in any Node.js >= 24 environment without polyfills or peer dependencies.
