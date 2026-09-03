# SKILL: @localess/cli

## Overview

`@localess/cli` is the **command-line interface** for the Localess headless CMS platform. It enables:

- Authenticating with a Localess instance
- Pushing and pulling translations (flat and nested JSON formats supported for both push and pull)
- Generating TypeScript type definitions from your space's schemas

**Status:** Early development (v3.2.4). Requires Node.js >= 24.0.0.

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
1. Checks for existing credentials (env vars or file)
2. Prompts interactively for any missing options
3. Validates credentials by calling the API
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

1. **Environment variables** (highest priority)
2. **`.localess/credentials.json`** (file-based)

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

### Push Translations

Upload a local JSON translation file to Localess.

```bash
localess translations push <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                        |
|------------|------------------------------------|
| `<locale>` | ISO 639-1 locale code: `en`, `de`… |

**Options:**

| Flag                    | Default       | Description                                                         |
|-------------------------|---------------|---------------------------------------------------------------------|
| `-p, --path <path>`     | required      | Path to the translations JSON file                                  |
| `-f, --format <format>` | `flat`        | File format: `flat` or `nested`                                     |
| `-t, --type <type>`     | `add-missing` | Update strategy: `add-missing`, `update-existing`, `delete-missing` |
| `--dry-run`             | `false`       | Preview changes without applying them                               |
| `-v, --verbose`         | `false`       | Print verbose debug output                                          |

**Update Strategies:**

| Strategy          | Behaviour                                                                      |
|-------------------|--------------------------------------------------------------------------------|
| `add-missing`     | Only adds keys that don't yet exist in Localess                                |
| `update-existing` | Only updates keys that already exist in Localess                               |
| `delete-missing`  | Deletes keys in Localess that are absent from the local file                   |

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
localess translations push en --path ./locales/en.json

# Update existing translations (don't add new)
localess translations push de --path ./locales/de.json --type update-existing

# Delete keys in Localess absent from the local file
localess translations push de --path ./locales/de.json --type delete-missing

# Preview changes without applying
localess translations push fr --path ./locales/fr.json --dry-run

# Push nested-format translations
localess translations push de --path ./locales/de.json --format nested
```

---

### Pull Translations

Download translations from Localess to a local JSON file.

```bash
localess translations pull <locale> --path <file> [options]
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
localess translations pull en --path ./locales/en.json

# Pull as nested JSON
localess translations pull de --path ./locales/de.json --format nested

# Pull draft (unpublished) translations
localess translations pull en --path ./locales/en.json --draft
```

---

### Diff Translations

Read-only comparison between a local translations file and the space — groups keys into `Create`/`Update`/`Stale` sections (color-coded, git-diff style `+`/`~`/`-` symbols). `unchanged` keys are collapsed into a single count by default (`--all` to list them) so drift stays visible even with thousands of translations. Exits `1` if anything differs (CI drift gate), `0` when everything is `unchanged`. Does not modify `push`'s behavior; use `push` to apply changes.

```bash
localess translations diff <locale> --path <file> [options]
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
localess translations diff en --path ./locales/en.json

# Compare against draft translations
localess translations diff en --path ./locales/en.json --draft

# Also list unchanged keys
localess translations diff en --path ./locales/en.json --all

# CI drift gate
- run: localess translations diff en --path ./locales/en.json
```

**Sample output** (2000 translations, 11 changed):

```
Create (2)
  + new.key
  + another.new.key

Update (5)
  ~ changed.key
  ~ nested.other.key

Stale (4)
  - removed.key
  - old.unused.key

1989 unchanged (use --all to show)

11 translation(s) differ: 2 created, 5 updated, 4 stale.
```

---

## Type Generation

Generate TypeScript type definitions from your Localess space's schemas.

```bash
localess types generate [--path <output>] [--prefix <prefix>]
```

**Options:**

| Flag                | Default                   | Description                                    |
|----------------------|---------------------------|-------------------------------------------------|
| `-p, --path <path>`  | `.localess/localess.d.ts` | Output file path                                |
| `--prefix <prefix>`  | `''`                      | Prefix to prepend to all generated type names   |
| `-v, --verbose`      | `false`                   | Print verbose debug output                      |

> **Prerequisite:** The API token must have the **Development Tools** permission in Localess Space settings.

**What it does:**
1. Fetches the schema definitions from your space
2. Generates TypeScript `.d.ts` definitions for each schema

**Examples:**

```bash
# Default output to .localess/localess.d.ts
localess types generate

# Custom output path
localess types generate --path src/types/localess.d.ts

# Prefix all generated type names to avoid collisions with other type names
localess types generate --prefix Localess
```

**Generated output:**

```typescript
// .localess/localess.d.ts (auto-generated — do not edit)
export type Page = {
  _id: string;
  _schema: string;
  title: string;
  body: (HeroSection | CardGrid | RichTextBlock)[];
};

export type HeroSection = {
  _id: string;
  _schema: string;
  headline: string;
  subheadline?: string;
  image?: ContentAsset;
};

// ... all schemas from your Localess space
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

> **Prerequisite:** The API token must have the **Development Tools** permission (`DEV_TOOLS`) — the same permission `types generate` and translation writes use. No dedicated schema permission exists.

> **Backend version:** `schema pull`/`push` require a Localess backend that serves `GET /schemas` as a `SchemaExport[]` array and exposes `POST /schemas`. Older backends return a `Record<schemaId, Schema>` map instead — this CLI's `getSchemas()` normalizes both shapes automatically, so pulling still works against an older backend, but `push` requires the newer `POST /schemas` endpoint.

### `schema validate <entry>`

Offline — no login, no network call. Runs `@localess/schema`'s `validate()` against the entry's config and prints each issue (`ERROR`/`WARNING`, code, path, message).

```bash
localess schema validate ./schemas/index.ts
localess schema validate ./schemas/index.ts --format json   # machine-readable, for CI
```

Exit code `1` when any error-severity issue is present; `0` otherwise (warnings alone don't fail).

### `schema pull [--path <dir>]`

Fetches the space's schemas and (re)generates one TypeScript definition file per schema plus `index.ts` (a `defineConfig()` call) into `--path` (default `schemas`).

```bash
localess schema pull
localess schema pull --path src/schemas
```

- **Repeatable and safe to re-run.** Every file pull generates starts with a marker comment; pull only ever overwrites or deletes files carrying that marker. A file it previously generated but whose schema no longer exists on the server is deleted; anything without the marker (your own hand-written files) is left untouched and reported.
- Cross-schema references (`OPTION`/`OPTIONS` `source`, `SCHEMA`/`SCHEMAS` `schemas`) are emitted as imports between the generated files, so pulled definitions read naturally and stay type-checked against each other.

### `schema diff <entry>`

Read-only comparison between the entry's code-defined schemas and the space — groups schemas into `Create`/`Update`/`Stale` sections (color-coded, git-diff style `+`/`~`/`-` symbols), same report format as `translations diff`. Unchanged schemas are collapsed into a count by default (`-a, --all` to list them). Exits `1` if anything differs (CI drift gate), `0` when everything is `unchanged`.

```bash
localess schema diff ./schemas/index.ts
localess schema diff ./schemas/index.ts --all   # also list unchanged schemas
```

### `schema push <entry> [--dry-run] [--delete] [-y|--yes]`

Validates, diffs, then pushes the entry's schemas to the space.

```bash
localess schema push ./schemas/index.ts --dry-run   # preview only
localess schema push ./schemas/index.ts             # upsert: create/update, never delete
localess schema push ./schemas/index.ts --delete    # sync: also delete schemas absent from code
localess schema push ./schemas/index.ts --delete -y # sync, skip the deletion confirmation prompt
```

- Aborts (exit `1`) without pushing if `validate()` reports any error.
- Default mode is **upsert** — creates and updates, never deletes. Schemas on the server but absent from code are reported as `stale` and left alone.
- `--delete` switches to **sync** mode, which also deletes stale schemas. Without `--yes`, you're asked to confirm the exact list before anything is deleted; `--dry-run` skips the prompt (nothing is written either way).
- Prints the server's final counts: `created`, `updated`, `deleted`, `unchanged`.

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
      - run: localess translations push en --path ./locales/en.json
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
```

### Pull Translations in CI

```yaml
      - run: localess translations pull en --path ./locales/en.json
        env:
          LOCALESS_ORIGIN: ${{ secrets.LOCALESS_ORIGIN }}
          LOCALESS_SPACE: ${{ secrets.LOCALESS_SPACE_ID }}
          LOCALESS_TOKEN: ${{ secrets.LOCALESS_TOKEN }}
      - run: git diff --exit-code locales/ || (git commit -am "chore: sync translations" && git push)
```

### Generate Types in CI

```yaml
      - run: localess types generate --path src/types/localess.d.ts
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
localess translations pull en --path ./locales/en.json

# 3. Edit translations locally...

# 4. Push back (dry-run first)
localess translations push en --path ./locales/en.json --dry-run
localess translations push en --path ./locales/en.json

# 5. Generate types after schema changes in Localess
localess types generate
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

| File                         | Created by                | Permissions          | Purpose                    |
|------------------------------|---------------------------|----------------------|----------------------------|
| `.localess/credentials.json` | `localess login`          | `0o600` (owner only) | Persisted auth credentials |
| `.localess/localess.d.ts`    | `localess types generate` | Standard             | Generated TypeScript types |

---

## Best Practices

1. **Use environment variables in CI/CD** — set `LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN` as secrets. No `login` command needed.

2. **Always dry-run before pushing translations** in automated scripts: add `--dry-run` first, inspect the output, then run without it.

3. **Commit generated types** (`.localess/localess.d.ts`) to your repo so the whole team benefits from type safety without running the CLI.

4. **Re-run `types generate` after any schema change** in the Localess CMS to keep types in sync.

5. **Use `add-missing` strategy (default)** for initial import of translations; switch to `update-existing` when syncing copy changes.

6. **Never commit `.localess/credentials.json`** — `localess login` automatically adds `.localess` to `.gitignore`, so credentials are protected out of the box.

7. **Give the token minimum required permissions** — the `types generate` command needs "Development Tools" permission; other commands only need standard API access.
