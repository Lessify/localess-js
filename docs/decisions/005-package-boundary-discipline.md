# ADR 005: Package Boundary Discipline

## Context

*Update:* the graph below is the original three-package one. It has since grown to twelve packages — see [ADR 007](007-shared-richtext-package.md), [ADR 008](008-schema-package.md), [ADR 009](009-shared-model-package.md), [ADR 011](011-nuxt-module-depends-on-vue.md), [ADR 013](013-live-preview-package.md), and rule 4 in `CLAUDE.md` for the current graph. The rule that dependent packages never depend on each other still holds, with the one exception ADR 011 describes.

This monorepo contains three packages. Their dependency relationships must be carefully controlled:

- `@localess/react` needs the core client types and API methods.
- `@localess/cli` needs the core client types and API methods.
- `@localess/react` and `@localess/cli` solve completely different problems (browser integration vs. developer tooling) and share no logic.

Without clear rules, it is tempting to share utilities between `react` and `cli` by making one depend on the other, or by extracting a fourth shared package. Both paths add complexity faster than they remove duplication.

## Decision

The dependency graph is fixed and one-directional:

```
@localess/react ──┐
                  ├──▶ @localess/client
@localess/cli   ──┘
```

Rules:
1. `@localess/react` and `@localess/cli` import from `@localess/client` using the workspace protocol (`"*"`).
2. `@localess/react` never imports from `@localess/cli`.
3. `@localess/cli` never imports from `@localess/react`.
4. No fourth shared package is created without explicit discussion.

## Consequences

**For contributors:**
- If you find shared logic needed by both `react` and `cli`, put it in `@localess/client` (if it has no external dependencies and fits the client's responsibility) or duplicate it (if it is small enough that duplication costs less than coupling).
- Changing `@localess/client`'s exported types or method signatures is a cross-package change — always check `packages/react/` and `packages/cli/` for affected call sites before committing.
- The workspace reference `"@localess/client": "*"` in `package.json` means the local workspace package is always used during development, regardless of what is published to npm.

**Version management:**
- All three packages share the same version number and are bumped together (see `scripts/` at the repo root).
