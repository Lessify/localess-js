# @localess/cli Reference

Command-line interface for the Localess headless CMS. Handles authentication, translation sync, TypeScript type generation, and schema pull/diff/push.

**Requires:** Node.js >= 24.0.0.

## Installation

```bash
npm install -g @localess/cli
# or without installing
npx @localess/cli [command]
```

## Authentication

### `localess login`

```bash
localess login \
  --origin https://my-localess.web.app \
  --space YOUR_SPACE_ID \
  --token YOUR_API_TOKEN
```

| Flag | Description |
|---|---|
| `-o, --origin <url>` | Localess instance URL |
| `-s, --space <id>` | Space ID (from Space settings) |
| `-t, --token <token>` | API token (masked input) |
| `-v, --verbose` | Print verbose debug output |

What it does:
1. Checks for existing credentials (env vars or file) — if found, prints `Already logged in.` and exits (run `logout` first to switch)
2. Prompts interactively for any missing options
3. Validates credentials against the API (`GET /spaces/{spaceId}`); exits `1` without saving on failure
4. Saves credentials to `.localess/credentials.json` (mode `0o600`)
5. Appends `.localess` to `.gitignore` automatically (creates the file if absent)

### `localess logout`

```bash
localess logout
```

Clears `.localess/credentials.json` (overwrites it with `{}`). If authenticated via environment variables, instructs you to unset them manually.

## Credential Resolution

Credentials are resolved in this priority order:

1. **Environment variables** (highest priority — recommended for CI/CD; all three must be set)
2. **`.localess/credentials.json`** in the current working directory (file-based — for local development)

Every command that talks to the API accepts `-v, --verbose` to print client debug output (request URLs, statuses). Commands that need credentials exit `1` with `Not logged in` when neither source is available.

### Environment variables

```bash
export LOCALESS_ORIGIN=https://my-localess.web.app
export LOCALESS_SPACE=YOUR_SPACE_ID
export LOCALESS_TOKEN=YOUR_API_TOKEN
```

### File-based credentials

```json
// .localess/credentials.json
{
  "origin": "https://my-localess.web.app",
  "space": "YOUR_SPACE_ID",
  "token": "YOUR_API_TOKEN"
}
```

> Never commit `.localess/credentials.json`. `localess login` adds `.localess` to `.gitignore` automatically.

> `localess translation` was previously `localess translations`, and `localess type` was `localess types`. The old plural names still work as aliases.

## `localess translation push`

Upload a local JSON translation file to Localess. Before applying anything, fetches the remote **draft** translations and prints the same grouped/colored diff report as `translation diff` (unchanged keys collapsed into a count unless `-a`), plus a note on what `--type` will do. `update-existing`/`delete-missing` prompt for confirmation (skippable with `-y`/`--dry-run`, or auto-skipped when there's nothing to do); `add-missing` never prompts. Declining the prompt prints `Aborted.` and exits `1`.

After pushing, prints the server's `message`/`ids`, then reconciles the pre-push diff against those ids and prints a `⚠ Prediction mismatch` warning (without failing) for any key whose predicted status didn't match the server's actual outcome — e.g. a concurrent change made between the preview and the push. A key is expected in `ids` only if its status matches the push type (`add-missing`→`create`, `update-existing`→`update`, `delete-missing`→`stale`); skipped when the response has no `ids`.

```bash
localess translation push <locale> --path <file> [options]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | required | Path to the translations JSON file |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |
| `-t, --type <type>` | `add-missing` | Update strategy (see below) |
| `--dry-run` | `false` | Preview changes without applying (also skips confirmation) |
| `-a, --all` | `false` | Also print unchanged keys in the preview |
| `-y, --yes` | `false` | Skip the confirmation prompt |
| `-v, --verbose` | `false` | Print verbose debug output |

### Update strategies

| Strategy | Behaviour | Confirmation |
|---|---|---|
| `add-missing` | Only adds keys absent from Localess | Never |
| `update-existing` | Only updates keys already in Localess — overwrites edits made in Localess since your last pull | Prompted |
| `delete-missing` | Deletes Localess keys absent from the local file | Prompted |

### File formats

**Flat** (default):
```json
{ "common.submit": "Submit", "nav.home": "Home" }
```

**Nested** (flattened automatically before uploading):
```json
{ "common": { "submit": "Submit" }, "nav": { "home": "Home" } }
```

### Examples

```bash
localess translation push en --path ./locales/en.json
localess translation push de --path ./locales/de.json --type update-existing
localess translation push de --path ./locales/de.json --type delete-missing
localess translation push fr --path ./locales/fr.json --dry-run
localess translation push de --path ./locales/de.json --format nested
```

## `localess translation pull`

Download translations from Localess to a local JSON file. Keys are sorted alphabetically (recursively for `nested`) for stable, diff-friendly output.

```bash
localess translation pull <locale> --path <file> [options]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | required | Output file path |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |
| `--draft` | `false` | Pull the draft (unpublished) version |
| `-v, --verbose` | `false` | Print verbose debug output |

```bash
localess translation pull en --path ./locales/en.json
localess translation pull de --path ./locales/de.json --format nested
localess translation pull en --path ./locales/en.json --draft
```

## `localess translation diff`

Read-only comparison between a local translations file and the space — groups keys into `Create`/`Update`/`Stale` sections (color-coded, git-diff style `+`/`~`/`-` symbols); unchanged keys collapse into a count by default. Exits `1` on any drift — use as a CI gate.

```bash
localess translation diff <locale> --path <file> [options]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | required | Path to the local translations file |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |
| `--draft` | `false` | Compare against the draft version |
| `-a, --all` | `false` | Also print unchanged keys |
| `-v, --verbose` | `false` | Print verbose debug output |

```bash
localess translation diff en --path ./locales/en.json
localess translation diff en --path ./locales/en.json --all
```

Report layout: `Create (n)` / `Update (n)` / `Stale (n)` sections (empty ones omitted), an `N unchanged (use --all to show)` line, then either `N translation(s) differ: a created, b updated, c stale.` or `In sync.`.

## `localess type generate`

Generate TypeScript type definitions from your Localess space's schemas.

```bash
localess type generate [--path <output>] [--prefix <prefix>]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | `.localess/localess.d.ts` | Output file path |
| `--prefix <prefix>` | `''` | Prefix prepended to every generated type name (including the helper types and `ContentData`) |
| `-v, --verbose` | `false` | Print verbose debug output |

> **Prerequisite:** The API token must have the **Development Tools** permission in Localess Space settings.

What it does:
1. Fetches the schema definitions from your space (`GET /schemas`)
2. Generates a single `.d.ts` file: `ContentAsset`/`ContentLink`/`ContentReference`/`ContentRichText` helper interfaces, one `interface` per `ROOT`/`NODE` schema (fields sorted by name; optional unless `required: true`; `_id: string` plus a literal `_schema: '<schemaId>'`), one string-literal union per `ENUM` schema, and a `ContentData` union of all `ROOT` types

```bash
localess type generate
localess type generate --path src/types/localess.d.ts
localess type generate --prefix Localess   # LocalessPage, LocalessContentAsset, LocalessContentData, ...
```

Generated output:
```typescript
/**
 * Generated by Localess CLI
 * Do not edit manually.
 */
export interface ContentAsset { kind: 'ASSET'; uri: string; }
// ... ContentLink, ContentReference, ContentRichText

export interface Page {
  /** Unique identifier of a component in a content. */
  _id: string;
  /** Unique identifier for the Schema object. */
  _schema: 'page';
  body?: (HeroSection | CardGrid | RichTextBlock)[];
  title: string;
}

export type ContentData = Page;
```

Using generated types:
```typescript
import type { Page } from './.localess/localess';
const content = await client.getContentBySlug<Page>('home');
```

## Schema Commands

Define schemas in TypeScript with `@localess/schema` (`defineSchema`/`defineEnum`/`defineConfig`) and sync them with a space. See [docs/schema.md](schema.md) for the authoring API.

Entry file: a TS/JS file exporting the result of `defineConfig()` (convention: `schemas/index.ts`).

> **Prerequisite:** The token needs the **Development Tools** permission (`DEV_TOOLS`) — same as `type generate`. No dedicated schema permission exists.

### `localess schema validate <entry>`

Offline — no login, no network. Loads the entry with `jiti` (default export first, then named exports; first value shaped like a `defineConfig()` result wins), prints each `validate()` issue as `ERROR|WARNING <code> <path> — <message>`; exits `1` on any error-severity issue or if no config is found. `--format json` prints the full `ValidationResult` instead.

```bash
localess schema validate ./schemas/index.ts
localess schema validate ./schemas/index.ts --format json
```

### `localess schema pull [--path <dir>]`

(Re)generates one TS definition file per schema (kebab-case name, e.g. `HeroBlock` → `hero-block.ts`) plus `index.ts` (`export const config = defineConfig({ schemas: [...] })`) from the space, into `--path` (default `schemas`). Repeatable: only overwrites/deletes files it previously generated (marked with a header comment); a same-named hand-written file without that marker is skipped and reported, never overwritten. Each field is emitted wrapped in `defineField(...)` rather than as a bare object literal (`import { defineField, defineSchema } from '@localess/schema'`; `defineEnum` for `ENUM`s). References to other pulled schemas (`source`, `schemas`) become `import { X } from './x'` statements and by-value refs; unknown ids stay strings. Output is deterministic.

```bash
localess schema pull
localess schema pull --path src/schemas
```

### `localess schema diff <entry>`

Read-only comparison, same grouped/colored report format as `translation diff` — `Create`/`Update`/`Stale` sections, unchanged schemas collapsed into a count by default. Equality is key-sorted JSON of each `SchemaExport`, matching the server's change detection. Exits `1` on any drift — use as a CI gate. Does not run `validate()` first (unlike `push`).

```bash
localess schema diff ./schemas/index.ts
localess schema diff ./schemas/index.ts --all   # also list unchanged schemas
```

### `localess schema push <entry> [--dry-run] [--delete] [-a] [-y]`

Validates, diffs, then pushes. The pre-push diff uses the same grouped/colored report as `schema diff` (`-a, --all` to also list unchanged schemas).

```bash
localess schema push ./schemas/index.ts --dry-run   # preview
localess schema push ./schemas/index.ts             # upsert: create/update only
localess schema push ./schemas/index.ts --delete    # sync: also delete schemas absent from code (confirms unless -y)
```

Aborts (exit `1`) without pushing if validation reports any error. Default is **upsert** (`type: 'upsert'` — stale server schemas are kept and listed in a warning); `--delete` sends `type: 'sync'` and prompts with the exact list unless `-y`, `--dry-run`, or nothing is stale. Prints the server's `created`/`updated`/`deleted`/`unchanged` counts (prefixed `[DryRun]` under `--dry-run`), then reconciles the pre-push diff against the returned `ids` and prints a `⚠ Prediction mismatch` warning (without failing the command) for any schema id whose predicted status didn't match what the server actually did — e.g. a concurrent change made between the preview and the push. `stale` entries are only reconciled in sync mode.

## CI/CD Integration

Use environment variables — no `localess login` step required.

```yaml
# .github/workflows/sync-translations.yml
name: Sync translations
on:
  push:
    paths: ['locales/**']
jobs:
  push-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm install -g @localess/cli
      - run: localess translation push en --path ./locales/en.json
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

Generate types in CI:
```yaml
      - run: localess type generate --path src/types/localess.d.ts
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

Gate merges on schema drift:
```yaml
      - run: localess schema validate ./schemas/index.ts
      - run: localess schema diff ./schemas/index.ts
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

## Local Development Workflow

```bash
# 1. Authenticate once
localess login

# 2. Generate types after schema changes in Localess CMS
localess type generate

# 3. Pull latest translations
localess translation pull en --path ./locales/en.json

# 4. Edit locally, then push (dry-run first)
localess translation push en --path ./locales/en.json --dry-run
localess translation push en --path ./locales/en.json
```

## Files Written by the CLI

| File | Created by | Permissions | Purpose |
|---|---|---|---|
| `.localess/credentials.json` | `localess login` | `0o600` (owner only) | Persisted auth credentials |
| `.localess/localess.d.ts` | `localess type generate` | Standard | Generated TypeScript types (path via `-p, --path`) |
| `schemas/<schema-id>.ts`, `schemas/index.ts` | `localess schema pull` | Standard | Generated `@localess/schema` definitions (dir via `-p, --path`; each file starts with the pull marker comment) |

## .gitignore Notes

`localess login` automatically appends `.localess` to `.gitignore`. To commit generated types while protecting credentials:

```gitignore
.localess/credentials.json
# .localess/localess.d.ts  ← uncomment if regenerating in CI instead of committing
```
