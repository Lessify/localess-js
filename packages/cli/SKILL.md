# SKILL: @localess/cli

## Overview

`@localess/cli` is the **command-line interface** for the Localess headless CMS platform. It enables:

- Authenticating with a Localess instance
- Pushing, pulling, and diffing translations (flat and nested JSON formats supported throughout)
- Generating TypeScript type definitions from your space's schemas
- Validating, pulling, diffing, and pushing code-defined schemas (`@localess/schema`) against your space

**Status:** v4.0.0. Requires Node.js >= 24.0.0. Binary name: `localess`.

Command groups use **singular** nouns: `localess login`, `localess logout`, `localess translation <pull|push|diff>`, `localess type generate`, `localess schema <validate|pull|diff|push>`. Every command that talks to the API accepts `-v, --verbose` (prints client debug output, including request URLs and statuses); commands that need credentials exit `1` with `Not logged in` when no session is found. After any command, the CLI checks the npm registry (3-second timeout, failures ignored) and prints an "Update available" box if a newer `@localess/cli` exists.

---

## Installation

```bash
npm install -g @localess/cli
# or use npx
npx @localess/cli [command]
```

---

## Authentication

### Login

Authenticate and persist credentials locally. Interactive prompts fill in any missing options.

```bash
localess login \
  --origin https://my-localess.web.app \
  --space YOUR_SPACE_ID \
  --token YOUR_API_TOKEN
```

**Options:**

| Flag                   | Description                     |
|------------------------|---------------------------------|
| `-o, --origin <url>`   | Localess instance URL           |
| `-s, --space <id>`     | Space ID (from Space settings)  |
| `-t, --token <token>`  | API token (masked input prompt) |
| `-v, --verbose`        | Print verbose debug output      |

**Behavior:**
1. Checks for existing credentials (env vars or file) — if found, prints `Already logged in.` and exits without prompting (run `localess logout` first to switch credentials)
2. Prompts interactively for any missing options
3. Validates credentials by calling the API (`GET /spaces/{spaceId}`); on failure prints `Login failed` and exits `1` without saving
4. Saves credentials to `.localess/credentials.json` (mode `0o600`)
5. Automatically adds `.localess` to `.gitignore` (creates the file if absent; skips if the entry already exists)

### Logout

```bash
localess logout
```

- Clears `.localess/credentials.json` (writes `{}`)
- If authenticated via environment variables, instructs you to unset them manually

---

## Credential Storage

Credentials are resolved in this priority order:

1. **Environment variables** (highest priority) — used only when all three of `LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN` are set
2. **`.localess/credentials.json`** (file-based, relative to the current working directory) — must contain all of `origin`, `space`, `token`; an empty `{}` (as written by `logout`) counts as logged out

### Environment Variables

```bash
export LOCALESS_ORIGIN=https://my-localess.web.app
export LOCALESS_SPACE=YOUR_SPACE_ID
export LOCALESS_TOKEN=YOUR_API_TOKEN
```

Recommended for **CI/CD pipelines** — no `localess login` step needed.

### File-based Credentials

```json
// .localess/credentials.json
{
  "origin": "https://my-localess.web.app",
  "space": "YOUR_SPACE_ID",
  "token": "YOUR_API_TOKEN"
}
```

> `.localess` is automatically added to `.gitignore` by `localess login` to prevent credentials from being committed.

---

## Translations

> `localess translation` was previously named `localess translations` (and `localess type` was `localess types`). The old plural names still work as aliases, but new scripts should use the singular form.

### Push Translations

Upload a local JSON translation file to Localess. Before pushing, fetches the remote **draft** translations and prints the same grouped/colored diff report as `translation diff` (`Create`/`Update`/`Stale` sections, unchanged collapsed into a count by default — `-a, --all` lists them), plus a one-line note on what the selected `--type` will actually do. `update-existing` and `delete-missing` prompt for confirmation before applying (skippable with `-y, --yes`, or automatically skipped under `--dry-run` or when there's nothing to do); `add-missing` never prompts since it's additive-only.

After a successful push, prints the server's `message` and (if present) the affected `ids`, then reconciles the pre-push diff against those ids and prints a `⚠ Prediction mismatch (local preview vs server result)` block (without failing) listing any key whose predicted status didn't match what the server actually did — e.g. a concurrent change made between the preview and the push. Since each push type performs exactly one operation, a key is expected in the response only if its predicted status matches that type (`add-missing`→`create`, `update-existing`→`update`, `delete-missing`→`stale`); skipped entirely when the response carries no `ids`. Each line reads `<key>: predicted "<create|update|unchanged|stale>", server reported "<affected|unaffected>"`.

```bash
localess translation push <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                        |
|------------|------------------------------------|
| `<locale>` | ISO 639-1 locale code: `en`, `de`… |

**Options:**

| Flag                    | Default       | Description                                                              |
|-------------------------|---------------|---------------------------------------------------------------------------|
| `-p, --path <path>`     | required      | Path to the translations JSON file                                        |
| `-f, --format <format>` | `flat`        | File format: `flat` or `nested`                                           |
| `-t, --type <type>`     | `add-missing` | Update strategy: `add-missing`, `update-existing`, `delete-missing`       |
| `--dry-run`             | `false`       | Preview changes without applying them (also skips the confirmation prompt) |
| `-a, --all`             | `false`       | Also print unchanged keys in the preview                                  |
| `-y, --yes`             | `false`       | Skip the confirmation prompt for `update-existing`/`delete-missing`       |
| `-v, --verbose`         | `false`       | Print verbose debug output                                                |

**Update Strategies:**

| Strategy          | Behaviour                                                                      | Confirmation                        |
|-------------------|--------------------------------------------------------------------------------|--------------------------------------|
| `add-missing`     | Only adds keys that don't yet exist in Localess — safe for unattended CI       | Never                                |
| `update-existing` | Only updates keys that already exist in Localess — **overwrites any edits made in Localess since your last pull** | Prompted (unless `-y`/`--dry-run`, or nothing differs) |
| `delete-missing`  | Deletes keys in Localess that are absent from the local file                   | Prompted (unless `-y`/`--dry-run`, or nothing is stale) |

**File Formats:**

*Flat (default):*
```json
{
  "common.submit": "Submit",
  "nav.home": "Home",
  "errors.required": "This field is required"
}
```

*Nested (automatically flattened before uploading):*
```json
{
  "common": { "submit": "Submit" },
  "nav": { "home": "Home" }
}
```

**Examples:**

```bash
# Basic push — add missing translations only
localess translation push en --path ./locales/en.json

# Update existing translations (don't add new) — prompts for confirmation
localess translation push de --path ./locales/de.json --type update-existing

# Same, but skip the confirmation prompt (e.g. scripted/CI use)
localess translation push de --path ./locales/de.json --type update-existing --yes

# Delete keys in Localess absent from the local file — prompts for confirmation
localess translation push de --path ./locales/de.json --type delete-missing

# Preview changes without applying
localess translation push fr --path ./locales/fr.json --dry-run

# Push nested-format translations
localess translation push de --path ./locales/de.json --format nested
```

---

### Pull Translations

Download translations from Localess to a local JSON file. Keys are sorted alphabetically (recursively for `nested`) so output is stable and git-diff-friendly. Pulls the published version unless `--draft` is given.

```bash
localess translation pull <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                        |
|------------|------------------------------------|
| `<locale>` | ISO 639-1 locale code: `en`, `de`… |

**Options:**

| Flag                    | Default   | Description                          |
|-------------------------|-----------|--------------------------------------|
| `-p, --path <path>`     | required  | Output file path                     |
| `-f, --format <format>` | `flat`    | File format: `flat` or `nested`      |
| `--draft`               | `false`   | Pull the draft version of translations |
| `-v, --verbose`         | `false`   | Print verbose debug output           |

**Examples:**

```bash
# Pull as flat JSON
localess translation pull en --path ./locales/en.json

# Pull as nested JSON
localess translation pull de --path ./locales/de.json --format nested

# Pull draft (unpublished) translations
localess translation pull en --path ./locales/en.json --draft
```

---

### Diff Translations

Read-only comparison between a local translations file and the space — groups keys into `Create`/`Update`/`Stale` sections (color-coded, git-diff style `+`/`~`/`-` symbols). `unchanged` keys are collapsed into a single count by default (`--all` to list them) so drift stays visible even with thousands of translations. Exits `1` if anything differs (CI drift gate), `0` when everything is `unchanged`. Compares against the published version unless `--draft` is given (note that `push` always previews against draft). Does not modify anything; use `push` to apply changes.

```bash
localess translation diff <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                        |
|------------|------------------------------------|
| `<locale>` | ISO 639-1 locale code: `en`, `de`… |

**Options:**

| Flag                    | Default  | Description                             |
|-------------------------|----------|------------------------------------------|
| `-p, --path <path>`     | required | Path to the local translations file       |
| `-f, --format <format>` | `flat`   | File format: `flat` or `nested`           |
| `--draft`                | `false`  | Compare against the draft version         |
| `-a, --all`              | `false`  | Also print unchanged keys                 |
| `-v, --verbose`          | `false`  | Print verbose debug output                |

**Examples:**

```bash
# Compare a local file against the space (exits 1 on drift)
localess translation diff en --path ./locales/en.json

# Compare against draft translations
localess translation diff en --path ./locales/en.json --draft

# Also list unchanged keys
localess translation diff en --path ./locales/en.json --all

# CI drift gate
- run: localess translation diff en --path ./locales/en.json
```

**Sample output** (2000 translations, 6 changed):

```
Create (2)
  + new.key
  + another.new.key

Update (2)
  ~ changed.key
  ~ nested.other.key

Stale (2)
  - removed.key
  - old.unused.key

1994 unchanged (use --all to show)

6 translation(s) differ: 2 created, 2 updated, 2 stale.
```

When nothing differs the report ends with `In sync.` instead. Sections are printed in the order `Create`, `Update`, `Stale`, then `Unchanged` (only with `--all`); empty sections are omitted.

---

## Type Generation

Generate TypeScript type definitions from your Localess space's schemas.

```bash
localess type generate [--path <output>] [--prefix <prefix>]
```

**Options:**

| Flag                | Default                   | Description                                    |
|----------------------|---------------------------|-------------------------------------------------|
| `-p, --path <path>`  | `.localess/localess.d.ts` | Output file path                                |
| `--prefix <prefix>`  | `''`                      | Prefix to prepend to all generated type names   |
| `-v, --verbose`      | `false`                   | Print verbose debug output                      |

> **Prerequisite:** The API token must have the **Development Tools** permission in Localess Space settings.

**What it does:**
1. Fetches the schema definitions from your space (`GET /schemas`)
2. Generates a single `.d.ts` file containing: the `ContentAsset`/`ContentLink`/`ContentReference`/`ContentRichText` helper interfaces; one `interface` per `ROOT`/`NODE` schema (fields sorted by name, optional unless `required: true`, `_id: string` plus a literal `_schema: '<schemaId>'` discriminator); one string-literal union `type` per `ENUM` schema (`string` if it has no values); and a `ContentData` union of all `ROOT` schema types (`unknown` if none)
3. Type names are `PascalCase(schema.id)` with `--prefix` prepended (the prefix also applies to the helper types and `ContentData`)

**Examples:**

```bash
# Default output to .localess/localess.d.ts
localess type generate

# Custom output path
localess type generate --path src/types/localess.d.ts

# Prefix all generated type names to avoid collisions with other type names
localess type generate --prefix Localess
```

**Generated output:**

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

export interface HeroSection {
  _id: string;
  _schema: 'hero-section';
  headline: string;
  image?: ContentAsset;
  subheadline?: string;
}

export type ButtonKind = 'primary' | 'secondary';

/**
* ContentData defined Object to connect all possible root Schemas.
*/
export type ContentData = Page;
```

**Using generated types:**

```typescript
import type { Page, HeroSection } from './.localess/localess';
import { getLocalessClient } from "@localess/react";

const client = getLocalessClient();
const content = await client.getContentBySlug<Page>('home');
// content.data is fully typed as Page
```

---

## Schema Commands

Define Localess schemas in TypeScript with `@localess/schema` and sync them bidirectionally with a Localess space. See [@localess/schema](../schema/SKILL.md) for the authoring API (`defineSchema`, `defineEnum`, `defineConfig`).

Entry-file convention: a TS/JS file exporting the result of `defineConfig()` — by convention `schemas/index.ts`, but any path works.

> **Prerequisite:** The API token must have the **Development Tools** permission (`DEV_TOOLS`) — the same permission `type generate` uses. No dedicated schema permission exists.

> **Backend version:** `schema pull`/`push` require a Localess backend that serves `GET /schemas` as a `SchemaExport[]` array and exposes `POST /schemas`. Older backends return a `Record<schemaId, Schema>` map instead — this CLI's `getSchemas()` normalizes both shapes automatically, so pulling still works against an older backend, but `push` requires the newer `POST /schemas` endpoint.

### `schema validate <entry>`

Offline — no login, no network call. Runs `@localess/schema`'s `validate()` against the entry's config and prints each issue (`ERROR`/`WARNING`, code, path, message).

```bash
localess schema validate ./schemas/index.ts
localess schema validate ./schemas/index.ts --format json   # machine-readable, for CI
```

Exit code `1` when any error-severity issue is present; `0` otherwise (warnings alone don't fail). Also exits `1` when the entry file can't be loaded or exports no `defineConfig()` result. `--format json` prints the full `ValidationResult` (`{ ok, issues[] }`) instead of one line per issue. The entry file is loaded with `jiti` — the default export is checked first, then every named export, and the first value shaped like a schema config (`schemas: [{ id, type: 'ROOT'|'NODE'|'ENUM', ... }]`) is used.

### `schema pull [--path <dir>]`

Fetches the space's schemas and (re)generates one TypeScript definition file per schema plus `index.ts` (a `defineConfig()` call) into `--path` (default `schemas`).

```bash
localess schema pull
localess schema pull --path src/schemas
```

- **File naming.** One file per schema, named by kebab-casing the schema id (`HeroBlock` → `hero-block.ts`), each exporting `const <SchemaId> = defineSchema({...})` / `defineEnum({...})`. `index.ts` imports them all and exports `const config = defineConfig({ schemas: [...] })`.
- **Repeatable and safe to re-run.** Every file pull generates starts with the marker comment `// Generated by \`localess schema pull\`. Do not edit — the next pull overwrites this file.`; pull only ever overwrites or deletes `.ts` files carrying that marker. A file it previously generated but whose schema no longer exists on the server is deleted (`Deleted <file> (schema no longer on server)`); a same-named file without the marker (your own hand-written file) is skipped, left untouched, and reported with a `Skipped ...` warning.
- Cross-schema references (`OPTION`/`OPTIONS` `source`, `SCHEMA`/`SCHEMAS` `schemas`) that point at another pulled schema are emitted as `import { X } from './x'` statements and by-value refs (`source: ButtonType`, `schemas: [Button]`), so pulled definitions read naturally and stay type-checked against each other. Ids not present in the pulled set stay plain strings.
- Each field is emitted wrapped in `defineField(...)`, not as a bare object literal — so a pulled file that's then hand-edited still gets `defineField`'s excess-property checking on the fields you touch. The import line is `import { defineField, defineSchema } from '@localess/schema';` (just `defineSchema` for a schema with no fields; `defineEnum` for `ENUM`).
- Deterministic: the same server state yields byte-identical files, so re-pulling into a committed directory produces a clean `git diff` when nothing changed.

### `schema diff <entry>`

Read-only comparison between the entry's code-defined schemas and the space — groups schemas into `Create`/`Update`/`Stale` sections (color-coded, git-diff style `+`/`~`/`-` symbols), same report format as `translation diff`. Unchanged schemas are collapsed into a count by default (`-a, --all` to list them). Exits `1` if anything differs (CI drift gate), `0` when everything is `unchanged`. Equality is determined by comparing key-sorted JSON of each `SchemaExport` (array order preserved), matching the server's own change detection — so `unchanged` here means a push would be a no-op there. Unlike `push`, `diff` does not run `validate()` first.

```bash
localess schema diff ./schemas/index.ts
localess schema diff ./schemas/index.ts --all   # also list unchanged schemas
```

### `schema push <entry> [--dry-run] [--delete] [-a|--all] [-y|--yes]`

Validates, diffs, then pushes the entry's schemas to the space. The pre-push diff uses the same grouped/colored report as `schema diff` (`-a, --all` to also list unchanged schemas).

```bash
localess schema push ./schemas/index.ts --dry-run   # preview only
localess schema push ./schemas/index.ts             # upsert: create/update, never delete
localess schema push ./schemas/index.ts --delete    # sync: also delete schemas absent from code
localess schema push ./schemas/index.ts --delete -y # sync, skip the deletion confirmation prompt
```

- Aborts (exit `1`) without pushing if `validate()` reports any error. All issues (errors and warnings) are printed first as `ERROR|WARNING <code> <path> — <message>`; warnings alone don't block.
- Default mode is **upsert** (`type: 'upsert'` in the `POST /schemas` body) — creates and updates, never deletes. Schemas on the server but absent from code are reported as `stale` and left alone, with a `Stale on server (kept — use --delete to remove): ...` warning.
- `--delete` switches to **sync** mode (`type: 'sync'`), which also deletes stale schemas. Without `--yes`, you're asked to confirm the exact list before anything is deleted; `--dry-run` skips the prompt (nothing is written either way), and no prompt appears when nothing is stale. Declining the prompt prints `Aborted.` and exits `1`.
- Prints the server's final counts: `created: N, updated: N, deleted: N, unchanged: N` (prefixed with `[DryRun] ` when the server echoes `dryRun: true`).
- Reconciles the pre-push diff against the server's returned `ids` (`created`/`updated`/`deleted` lists) and prints a `⚠ Prediction mismatch (local preview vs server result)` block (without failing) for any schema id whose predicted status didn't match the server's actual outcome — e.g. a concurrent change made between the preview and the push. `stale` entries are only reconciled in sync mode, since upsert never sends them. Each line reads `<id>: predicted "<create|update|unchanged|stale>", server reported "<created|updated|deleted|unchanged>"`.

### CI recipe

```yaml
- run: localess schema validate ./schemas/index.ts
- run: localess schema diff ./schemas/index.ts     # fails the build on drift
  env:
    LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
    LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
    LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/sync-translations.yml
name: Sync translations

on:
  push:
    paths:
      - 'locales/**'

jobs:
  push-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm install -g @localess/cli
      - run: localess translation push en --path ./locales/en.json
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

### Pull Translations in CI

```yaml
      - run: localess translation pull en --path ./locales/en.json
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
      - run: git diff --exit-code locales/ || (git commit -am "chore: sync translations" && git push)
```

### Generate Types in CI

```yaml
      - run: localess type generate --path src/types/localess.d.ts
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

---

## Local Development Workflow

```bash
# 1. Authenticate once
localess login

# 2. Pull latest translations
localess translation pull en --path ./locales/en.json

# 3. Edit translations locally...

# 4. Push back (dry-run first)
localess translation push en --path ./locales/en.json --dry-run
localess translation push en --path ./locales/en.json

# 5. Generate types after schema changes in Localess
localess type generate

# 6. Or manage schemas in code: pull once, edit, validate, diff, push
localess schema pull --path ./schemas
localess schema validate ./schemas/index.ts
localess schema diff ./schemas/index.ts
localess schema push ./schemas/index.ts --dry-run
localess schema push ./schemas/index.ts
```

---

## .gitignore

`localess login` automatically appends `.localess` to `.gitignore` in the current working directory (creating the file if it doesn't exist). No manual step is required.

If you want to commit generated types while still ignoring credentials, you can refine the entry manually after login:

```gitignore
# Localess credentials (contains API token) — added automatically by `localess login`
.localess/credentials.json

# Commit generated types so the whole team benefits from type safety;
# only exclude if types are regenerated in CI:
# .localess/localess.d.ts
```

---

## Files Written by the CLI

| File                                | Created by               | Permissions          | Purpose                                              |
|-------------------------------------|--------------------------|----------------------|------------------------------------------------------|
| `.localess/credentials.json`        | `localess login`         | `0o600` (owner only) | Persisted auth credentials                           |
| `.localess/localess.d.ts`           | `localess type generate` | Standard             | Generated TypeScript types (path via `-p, --path`)   |
| `schemas/<schema-id>.ts`, `schemas/index.ts` | `localess schema pull` | Standard       | Generated `@localess/schema` definitions (dir via `-p, --path`; each file starts with the pull marker comment) |
| `.gitignore` (appends `.localess`)  | `localess login`         | Standard             | Keeps credentials out of version control             |

---

## API Errors and Retries

- Network errors and `5xx` responses are retried 3 times with a 500 ms delay before the command fails.
- Any non-OK response is rendered as a boxed error (`Localess API Error — <method>`) with `Status`, optional `Code`, the request `URL` (token redacted), and a `Hint`, then the command exits `1`. `401` hints point at the credentials (env vars or `.localess/credentials.json`) and link to the space's token settings page; `403` hints list the `requiredPermissions` from the response body when present and remind you that a CDN (read-only) token isn't enough.
- Colors are disabled when stdout isn't a TTY or `NO_COLOR` is set.

---

## Best Practices

1. **Use environment variables in CI/CD** — set `LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN` as secrets. No `login` command needed.

2. **Always dry-run before pushing translations** in automated scripts: add `--dry-run` first, inspect the output, then run without it.

3. **Commit generated types** (`.localess/localess.d.ts`) to your repo so the whole team benefits from type safety without running the CLI.

4. **Re-run `type generate` after any schema change** in the Localess CMS to keep types in sync.

5. **Use `add-missing` strategy (default)** for initial import of translations; switch to `update-existing` when syncing copy changes.

6. **Never commit `.localess/credentials.json`** — `localess login` automatically adds `.localess` to `.gitignore`, so credentials are protected out of the box.

7. **Give the token minimum required permissions** — `type generate` and the `schema pull`/`diff`/`push` commands need the "Development Tools" permission; translation commands only need standard API access. A `403` response lists the exact permission(s) the token is missing.

8. **Gate CI on drift, not on push** — `translation diff` and `schema diff` exit `1` when local and remote differ, so use them as read-only checks in pull-request pipelines and reserve `push` for a trusted branch.
