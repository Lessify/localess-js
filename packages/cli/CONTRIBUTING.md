# Contributing to @localess/cli

CLI tool built with Commander.js. Entry point: `src/index.ts`. All commands live under `src/commands/`.

## Importing from `@localess/client` or `@localess/model`

**`src/models/index.ts` and `src/client.ts` are the only files allowed to import from `@localess/client` or `@localess/model` directly.** `models/index.ts` re-exports every `@localess/client`/`@localess/model` type the package needs plus `LocalessApiError` (a class, but consumed in type position via `catch`/`instanceof`, so it lives with the domain model). `client.ts` is the one place that calls `localessClient(...)` and wraps it in `localessCliClient` (the CLI-specific client with retry/error-formatting behavior) — `localessClient` is a callable factory, not a type, so it's imported there directly rather than re-exported through `models`. Every other file in this package imports what it needs from `./models` (or the correct relative path) instead. When a new file needs something from `@localess/client`/`@localess/model` that neither re-exports yet, add it to whichever matches.

## Utility Placement

Command-specific business-logic utilities (diffing, loading, emitting — not the client/model/schema import boundary above) are placed by consumer count, checked at the point a new subcommand needs one:

1. **Subcommand-local** — used by exactly one subcommand: lives inside that subcommand's own folder, `commands/<group>/<subcommand>/<name>.ts` (+ co-located `<name>.test.ts`). E.g. `commands/schema/pull/emitter.ts`, `commands/type/generate/generator.ts`, `commands/translation/diff/diff-translations.ts`.
2. **Group-shared** — used by 2+ subcommands within the same command group: lives directly in the group folder, sibling to the subcommand folders, `commands/<group>/<name>.ts`. E.g. `commands/schema/diff-schemas.ts`, `loader.ts`, `schema-lib.ts` (shared by `diff/`, `push/`, and/or `validate/`).
3. **Package-shared** — used across 2+ command groups, or cross-cutting infra: stays at `src/` root (`utils.ts`, `file.ts`, `session.ts`, `client.ts`, `models/`). This tier is also where the `@localess/client`/`@localess/model`/`@localess/schema` import-boundary files live (see above) — no change to that rule. E.g. `diff-report.ts` (the grouped/colored diff printer shared by `translation diff` and `schema diff`).

Don't import a sibling subcommand's local utility across folders — promote it to the group folder first. If a group-shared utility later gains a consumer in another group, promote it again to `src/` root.

## Importing from `@localess/schema`

**`src/commands/schema/schema-lib.ts` is the only file allowed to import runtime functions from `@localess/schema` directly.** It re-exports `toSchemaExport`/`validate` and the types every schema command needs. Type-only re-exports (`SchemaExport`, `SchemaField`, …) flow through `src/models/schema.ts` instead, alongside the CLI's own push-specific types in `src/models/schema-push.ts`. Every other file under `src/commands/schema/` imports from `./schema-lib` or `../../models`, never from `@localess/schema` directly.

### Schema command module map

`schema-lib.ts`, `loader.ts`, and `diff-schemas.ts` sit at the group level (not inside a subcommand folder) because 3 subcommands share them — see "Utility Placement" above.

| File | Responsibility |
|---|---|
| `schema-lib.ts` | the one `@localess/schema` runtime import point |
| `loader.ts` | `isSchemaConfig` (structural check), `loadSchemaConfig` (jiti-loads a TS/JS entry file, finds the `defineConfig()` export) |
| `diff-schemas.ts` | `stableStringify` (sorted-key JSON, matches the server's change detection), `diffSchemas` (create/update/unchanged/stale classification) |
| `validate/index.ts` | `schema validate` — offline |
| `pull/emitter.ts` | `emitSchemaFiles` — deterministic TS-file generation from `SchemaExport[]` |
| `pull/index.ts` | `schema pull` — fetch, emit, marker-owned overwrite/delete |
| `diff/index.ts` | `schema diff` — read-only, exit 1 on drift |
| `push/index.ts` | `schema push` — validate → diff → confirm (if `--delete`) → `pushSchemas()` |
| `index.ts` | `schemaCommand` — the parent `Command`, registers all four subcommands |

### Adding a schema subcommand

Follow "Adding a Subcommand" below, but register on `schemaCommand` in `src/commands/schema/index.ts` instead of a translation-style parent. Reuse `loadSchemaConfig`/`schema-lib`'s `validate`/`toSchemaExport` and `diffSchemas` rather than re-implementing config loading or diffing.

### Commander gotcha: testing a subcommand directly vs. through its parent

`Command.parseAsync(argv, { from: 'user' })` expects `argv` to be exactly the arguments **that command instance itself** consumes — it does **not** expect its own name first, unless you're calling `parseAsync` on the **parent** that routes to it by name. Concretely:

```typescript
// WRONG — schemaValidateCommand is the leaf; 'validate' becomes an unexpected extra
// positional argument, corrupting `<entry>` and producing a confusing "Cannot find
// module" error from deep inside jiti (the actual entry path was silently discarded).
await schemaValidateCommand.parseAsync(['validate', entry], { from: 'user' });

// RIGHT — drive the parent, exactly like `type.test.ts` does with `typeCommand`.
await schemaCommand.parseAsync(['validate', entry], { from: 'user' });
```

All of this package's own subcommand tests (`schema/validate/validate.test.ts`, `schema/push/push.test.ts`, `schema/diff/diff.test.ts`, `schema/pull/pull.test.ts`) drive the parent command. Do the same for any new subcommand test.

## Session / Credentials

Commands that need to talk to the Localess API must read the session first:

```typescript
import { getSession } from '../../session';

const session = await getSession();
if (!session.isLoggedIn) {
  console.error('Not logged in. Run "localess login" first.');
  process.exit(1);
}
// session.origin, session.space, session.token are available
```

`getSession()` checks environment variables (`LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN`) first, then falls back to `.localess/credentials.json` in the current working directory.

## Adding a New Top-Level Command

**1. Create `src/commands/<name>/index.ts`:**

```typescript
import { Command } from 'commander';

import { getSession } from '../../session';

type MyCommandOptions = {
  flag?: string;
};

export const myCommand = new Command('my-command')
  .description('Short description of what this command does')
  .option('-f, --flag <value>', 'Description of the flag')
  .action(async (options: MyCommandOptions) => {
    const session = await getSession();
    if (!session.isLoggedIn) {
      console.error('Not logged in. Run "localess login" first.');
      process.exit(1);
    }
    // implementation
  });
```

**2. Wire into `src/program.ts`:**

```typescript
import { myCommand } from './commands/my-command';
// ...
program.addCommand(myCommand);
```

## Adding a Subcommand

Group related operations under a parent command (e.g. `translation push`, `translation pull`). Subcommand-only helper functions go inside the subcommand's own folder alongside `index.ts`; see "Utility Placement" above before reaching into a sibling subcommand's file.

**1. Create the subcommand folder, e.g. `src/commands/translation/my-sub/index.ts`:**

```typescript
import { Command } from 'commander';
import { getSession } from '../../session';

type MySubOptions = {
  path: string;
};

export const translationMySubCommand = new Command('my-sub')
  .description('Short description')
  .requiredOption('-p, --path <path>', 'Path to the file')
  .action(async (options: MySubOptions) => {
    const session = await getSession();
    if (!session.isLoggedIn) {
      console.error('Not logged in. Run "localess login" first.');
      process.exit(1);
    }
    // implementation
  });
```

**2. Register on the parent command in `src/commands/translation/index.ts`:**

```typescript
import { translationMySubCommand } from './my-sub';

export const translationCommand = new Command('translation')
  .alias('translations')
  .description('Manage translations')
  .addCommand(translationPushCommand)
  .addCommand(translationPullCommand)
  .addCommand(translationMySubCommand); // add here
```

New top-level command groups (parent commands with no existing collection to join) should use a singular noun, matching `schema`/`translation`/`type` — see "Adding a New Top-Level Command" above.

## Testing

Tests live co-located with the command file as `<name>.test.ts`. Use vitest.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the session module before importing the command
vi.mock('../../session', () => ({
  getSession: vi.fn(),
}));

import { getSession } from '../../session';
import { myCommand } from './index';

describe('my-command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exits with error when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    await expect(myCommand.parseAsync(['node', 'localess', 'my-command'])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
```

Run tests:
```bash
npm test --workspace=@localess/cli
```

## Build

```bash
npm run build:cli
# or from packages/cli/
npm run build
```

Output: `dist/index.mjs` (ESM only, with `--shims` for Node.js polyfills).
