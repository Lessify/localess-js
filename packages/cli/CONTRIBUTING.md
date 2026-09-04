# Contributing to @localess/cli

CLI tool built with Commander.js. Entry point: `src/index.ts` (shebang + `program.parse`), which loads the `Command` tree from `src/program.ts`. `program.ts` registers the five top-level commands (`login`, `logout`, `schema`, `translation`, `type`) and the `preAction`/`postAction` hooks that run the npm update check (`src/version-check.ts`). All commands live under `src/commands/`. The published binary is `localess` (`bin` in `package.json`).

## Importing from `@localess/client` or `@localess/model`

**`src/models/index.ts` and `src/client.ts` are the only files allowed to import from `@localess/client` or `@localess/model` directly.** `models/index.ts` re-exports `LocalessClientOptions` and `LocalessApiError` from `@localess/client` (the latter is a class, but consumed in type position via `catch`/`instanceof`, so it lives with the domain model), plus `export * from '@localess/model'` — which is how `SchemaExport`, `SchemaField`, `Space`, `Translations`, and every other domain type reach the rest of the package. `client.ts` is the one place that calls `localessClient(...)` and wraps it in `localessCliClient` (the CLI-specific client with retry/error-formatting behavior and the extra `getSpace`/`getSchemas`/`getOpenApi`/`updateTranslations`/`pushSchemas` methods) — `localessClient` is a callable factory, not a type, so it's imported there directly rather than re-exported through `models`. Every other file in this package imports what it needs from `./models` (or the correct relative path) instead. When a new file needs something from `@localess/client` that `models` doesn't re-export yet, add it there. (CLAUDE.md rule 7 also names a **utils** module as a sanctioned import site; in this package `src/utils.ts` holds only ANSI constants and object helpers and imports nothing from `@localess/*` — there is currently no third import point.)

## Utility Placement

Command-specific business-logic utilities (diffing, loading, emitting — not the client/model/schema import boundary above) are placed by consumer count, checked at the point a new subcommand needs one:

1. **Subcommand-local** — used by exactly one subcommand: lives inside that subcommand's own folder, `commands/<group>/<subcommand>/<name>.ts` (+ co-located `<name>.test.ts`). E.g. `commands/schema/pull/emitter.ts`, `commands/type/generate/generator.ts`.
2. **Group-shared** — used by 2+ subcommands within the same command group: lives directly in the group folder, sibling to the subcommand folders, `commands/<group>/<name>.ts`. E.g. `commands/schema/diff-schemas.ts`, `loader.ts`, `schema-lib.ts` (shared by `diff/`, `push/`, and/or `validate/`); `commands/translation/diff-translations.ts` (`diffTranslations` for `diff/` and `push/`, plus `reconcileTranslationDiff`/`printTranslationDiffMismatches` used by `push/` — promoted here once `push` started reusing it alongside `diff/`).
3. **Package-shared** — used across 2+ command groups, or cross-cutting infra: stays at `src/` root (`utils.ts`, `file.ts`, `session.ts`, `client.ts`, `version-check.ts`, `models/`). This tier is also where the `@localess/client`/`@localess/model` import-boundary files live (see above) — no change to that rule. E.g. `diff-report.ts` (`printDiffReport` — the grouped/colored diff printer shared by `translation diff`/`push` and `schema diff`/`push`; it returns `{ created, updated, stale, drift }` so the caller decides the exit code).

Don't import a sibling subcommand's local utility across folders — promote it to the group folder first. If a group-shared utility later gains a consumer in another group, promote it again to `src/` root.

## Importing from `@localess/schema`

**`src/commands/schema/schema-lib.ts` is the only file allowed to import from `@localess/schema` directly.** It re-exports the runtime functions `toSchemaExport`/`validate` and the config/validation types (`LocalessSchemaConfig`, `ValidationIssue`, `ValidationResult`). The `SchemaExport`/`SchemaField`/… export types now live in `@localess/model` and reach the CLI through `models/index.ts`'s `export * from '@localess/model'` (the former `src/models/schema.ts` shim was removed); the CLI's own push request/response types live in `src/models/schema-push.ts`. Every other file under `src/commands/schema/` imports from `./schema-lib` or `../../models`, never from `@localess/schema` directly. (The `'@localess/schema'` strings inside `pull/emitter.ts` are emitted into generated files, not imports.)

### Schema command module map

`schema-lib.ts`, `loader.ts`, and `diff-schemas.ts` sit at the group level (not inside a subcommand folder) because 3 subcommands share them — see "Utility Placement" above.

| File | Responsibility |
|---|---|
| `schema-lib.ts` | the one `@localess/schema` runtime import point |
| `loader.ts` | `isSchemaConfig` (structural check), `loadSchemaConfig` (jiti-loads a TS/JS entry file, finds the `defineConfig()` export) |
| `diff-schemas.ts` | `stableStringify` (sorted-key JSON, matches the server's change detection), `diffSchemas` (create/update/unchanged/stale classification), `reconcileSchemaDiff` (compares the pre-push diff with the server's `ids`; `stale` only under `sync`), `printSchemaDiffMismatches` |
| `validate/index.ts` | `schema validate` — offline, `--format text|json` |
| `pull/emitter.ts` | `emitSchemaFiles` — deterministic TS-file generation from `SchemaExport[]` (kebab-case file names, `defineField(...)`-wrapped fields, cross-schema imports), `PULL_MARKER`, `toKebabCase` |
| `pull/index.ts` | `schema pull` — fetch, emit, marker-owned overwrite/delete, skip-and-warn on unmarked same-named files |
| `diff/index.ts` | `schema diff` — read-only, `printDiffReport`, exit 1 on drift |
| `push/index.ts` | `schema push` — validate → diff (`printDiffReport`) → confirm (if `--delete`, skipped by `--yes`/`--dry-run`/nothing stale) → `pushSchemas()` → print counts → reconcile and warn on prediction mismatches |
| `index.ts` | `schemaCommand` — the parent `Command`, registers all four subcommands |

The translation group mirrors this: `translation/diff-translations.ts` (`diffTranslations`, `reconcileTranslationDiff`, `printTranslationDiffMismatches`), `translation/{pull,push,diff}/index.ts`, and `translation/index.ts` (`translationCommand`, with the legacy `translations` alias). `type/index.ts` (`typeCommand`, alias `types`) has a single `generate/` subcommand whose codegen lives in `generate/generator.ts`.

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

The schema subcommand tests (`schema/validate/validate.test.ts`, `schema/push/push.test.ts`, `schema/diff/diff.test.ts`, `schema/pull/pull.test.ts`) and `type/type.test.ts` drive the parent command. The translation tests (`translation/{pull,push,diff}/*.test.ts`) and `login/login.test.ts` instead call `parseAsync` on the leaf command with only that command's own arguments (e.g. `translationPushCommand.parseAsync(['en', '-p', 'file.json'], { from: 'user' })`). Either is fine — just never mix the two by passing the subcommand's name to the leaf.

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

`getSession()` checks environment variables (`LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN` — all three must be set) first, then falls back to `.localess/credentials.json` in the current working directory (all of `origin`/`space`/`token` required; `{}` means logged out). The returned session carries `method: 'env' | 'file'`, which `logout` uses to decide between clearing the file and telling the user to unset the env vars.

Then build the API client through `localessCliClient` from `src/client.ts`, forwarding `--verbose` as `debug`:

```typescript
const client = localessCliClient({
  origin: session.origin,
  spaceId: session.space,
  token: session.token,
  ...(options.verbose ? { debug: true } : {}),
});
```

In `catch` blocks, only log errors that are **not** a `LocalessApiError` — the client has already printed a boxed error for those — then `process.exit(1)`.

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

import { getSession } from '../../../session';

type MySubOptions = {
  path: string;
  verbose?: boolean;
};

export const translationMySubCommand = new Command('my-sub')
  .description('Short description')
  .requiredOption('-p, --path <path>', 'Path to the file')
  .option('-v, --verbose', 'Print verbose debug output')
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
  .addCommand(translationDiffCommand)
  .addCommand(translationMySubCommand); // add here
```

If the subcommand compares local vs. remote state, reuse `printDiffReport` from `src/diff-report.ts` (accept `-a, --all` to include unchanged entries) so the output matches `translation diff`/`schema diff`, and exit `1` on drift when the command is read-only.

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

    // Leaf command: pass only its own arguments (see the Commander gotcha above).
    await expect(myCommand.parseAsync(['--flag', 'value'], { from: 'user' })).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
```

Also mock `../../client` (`localessCliClient: vi.fn()`) so no real network call is made, and `../../file` where the command reads or writes files. Tests that exercise interactive prompts mock `@inquirer/prompts` (`confirm`/`input`/`password`).

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

Built with Vite in library mode (`vite.config.mts`, target `node20`, `formats: ['es']`). Output: `dist/index.mjs` (ESM only) plus `dist/index.d.ts`. Node built-ins and all runtime dependencies (`@localess/*`, `@inquirer/prompts`, `commander`, `chalk`, `jiti`, `zod`) are marked external. A small plugin `chmod`s the emitted file to `0o755` so the `bin` entry is executable. `@localess/model` and `@localess/schema` must be built first (`npm run build:model`, `npm run build:schema`) before running this package's tests.
