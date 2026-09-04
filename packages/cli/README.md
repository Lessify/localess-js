<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess CLI

The `@localess/cli` package is the official command-line interface for the [Localess](https://github.com/Lessify/localess) headless CMS platform. It provides commands to authenticate with your Localess instance, synchronize translations, generate TypeScript type definitions, and sync code-defined schemas with your space.

## Requirements

- Node.js >= 24.0.0

## Installation

```bash
# Install as a project dev dependency (recommended)
npm install @localess/cli -D

# Or install globally
npm install @localess/cli -g
```

---

## Features

- 🔐 **Authentication** — Secure credential storage for CLI and CI/CD environments
- 🌐 **Translations** — Push, pull, and diff translation files against your Localess space
- 🛡️ **Type Generation** — Generate TypeScript type definitions from your Localess content schemas for end-to-end type safety
- 🧬 **Schema Sync** — Define schemas in code and pull, diff, and push them against your Localess space

---

## Authentication

### `localess login`

Authenticate with your Localess instance. Credentials are validated immediately and stored securely in `.localess/credentials.json` with restricted file permissions (`0600`).

```bash
localess login --origin <origin> --space <space_id> --token <api_token>
```

If any option is omitted, the CLI will interactively prompt for the missing values. Credentials are validated with a `GET /spaces/{spaceId}` call before being saved, and `.localess` is appended to `.gitignore` automatically (the file is created if absent; the entry is skipped if already present). If a session already exists (env vars or file), `login` prints `Already logged in.` and exits without prompting — run `localess logout` first to switch credentials.

**Options:**

| Flag                    | Description                                                 |
|-------------------------|-------------------------------------------------------------|
| `-o, --origin <origin>` | Localess instance URL (e.g., `https://my-localess.web.app`) |
| `-s, --space <space>`   | Space ID (found in Localess Space settings)                 |
| `-t, --token <token>`   | API token (input is masked for security)                    |
| `-v, --verbose`         | Print verbose debug output                                  |

**Examples:**

```bash
# Interactive login (prompts for any missing values)
localess login

# Non-interactive login (CI/CD)
localess login --origin https://my-localess.web.app --space MY_SPACE_ID --token MY_API_TOKEN
```

#### Authentication via Environment Variables

For CI/CD pipelines, you can provide credentials through environment variables instead of running `localess login`. The CLI automatically reads these variables and skips the file-based credentials. All three must be set — if any is missing, the CLI falls back to `.localess/credentials.json` in the current working directory:

```bash
export LOCALESS_ORIGIN=https://my-localess.web.app
export LOCALESS_SPACE=MY_SPACE_ID
export LOCALESS_TOKEN=MY_API_TOKEN

localess translation pull en --path ./public/locales/en.json
```

| Variable          | Description           |
|-------------------|-----------------------|
| `LOCALESS_ORIGIN` | Localess instance URL |
| `LOCALESS_SPACE`  | Space ID              |
| `LOCALESS_TOKEN`  | API token             |

---

### `localess logout`

Clear stored credentials from `.localess/credentials.json` (the file is overwritten with `{}`).

```bash
localess logout
```

> If you authenticated via environment variables, those must be unset manually — `logout` only affects file-based credentials.

---

## Translations Management

> `localess translation` was previously `localess translations`, and `localess type` was `localess types`. The old plural names still work as aliases for backward compatibility.

### `localess translation push <locale>`

Push a local JSON translation file to your Localess space. Only keys present in the file are affected, based on the selected update type. Before applying anything, fetches the remote **draft** translations and prints the same grouped/colored diff report as `translation diff` (`Create`/`Update`/`Stale` sections; unchanged keys collapsed into a count unless `-a`/`--all`), plus a note on what the selected `--type` will do. `update-existing` and `delete-missing` prompt for confirmation first (skippable with `-y`/`--yes`, or auto-skipped under `--dry-run` or when there's nothing to do); `add-missing` never prompts.

After the push, prints the server's summary `message` and (if present) the affected translation `ids`, then reconciles the pre-push diff against those ids and prints a `⚠ Prediction mismatch` warning (without failing) for any key whose predicted status doesn't match what the server actually did — e.g. a concurrent edit made in Localess between the preview and the push. Skipped when the response carries no `ids`.

```bash
localess translation push <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                                    |
|------------|------------------------------------------------|
| `<locale>` | ISO 639-1 locale code (e.g., `en`, `de`, `fr`) |

**Options:**

| Flag                    | Default       | Description                                                              |
|-------------------------|---------------|-----------------------------------------------------------------------------|
| `-p, --path <path>`     | *(required)*  | Path to the JSON translations file                                        |
| `-f, --format <format>` | `flat`        | File format: `flat` or `nested`                                           |
| `-t, --type <type>`     | `add-missing` | Update strategy: `add-missing`, `update-existing`, or `delete-missing`    |
| `--dry-run`             | `false`       | Preview changes without applying them (also skips the confirmation prompt) |
| `-a, --all`             | `false`       | Also print unchanged keys in the preview                                  |
| `-y, --yes`             | `false`       | Skip the confirmation prompt for `update-existing`/`delete-missing`       |
| `-v, --verbose`         | `false`       | Print verbose debug output                                                |

**Update Strategies:**

| Type              | Description                                                                   | Confirmation                                            |
|-------------------|--------------------------------------------------------------------------------|----------------------------------------------------------|
| `add-missing`     | Adds translations for keys that do not yet exist in Localess                  | Never — safe for unattended CI                            |
| `update-existing` | Updates translations for keys that already exist in Localess — **overwrites any edits made in Localess since your last pull** | Prompted (unless `-y`/`--dry-run`, or nothing differs)    |
| `delete-missing`  | Deletes translations in Localess for keys that are absent from the local file | Prompted (unless `-y`/`--dry-run`, or nothing is stale)   |

**File Formats:**

- **`flat`** — A flat JSON object where keys may use dot notation:
  ```json
  {
    "common.submit": "Submit",
    "nav.home": "Home"
  }
  ```

- **`nested`** — A nested JSON object that is automatically flattened before uploading:
  ```json
  {
    "common": { "submit": "Submit" },
    "nav": { "home": "Home" }
  }
  ```

**Examples:**

```bash
# Push English translations (add missing keys only)
localess translation push en --path ./locales/en.json

# Push with update-existing strategy (prompts for confirmation)
localess translation push en --path ./locales/en.json --type update-existing

# Same, but skip the confirmation prompt (e.g. scripted/CI use)
localess translation push en --path ./locales/en.json --type update-existing --yes

# Delete keys in Localess absent from the local file (prompts for confirmation)
localess translation push en --path ./locales/en.json --type delete-missing

# Preview changes without applying (dry run)
localess translation push en --path ./locales/en.json --dry-run

# Push nested-format translations
localess translation push de --path ./locales/de.json --format nested
```

---

### `localess translation pull <locale>`

Pull translations from your Localess space and save them to a local file. Keys are sorted alphabetically (recursively for `nested`) so the output is stable across runs and diff-friendly in git.

```bash
localess translation pull <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                                    |
|------------|------------------------------------------------|
| `<locale>` | ISO 639-1 locale code (e.g., `en`, `de`, `fr`) |

**Options:**

| Flag                    | Default      | Description                          |
|-------------------------|--------------|--------------------------------------|
| `-p, --path <path>`     | *(required)* | Output file path                     |
| `-f, --format <format>` | `flat`       | File format: `flat` or `nested`      |
| `--draft`               | `false`      | Pull the draft (unpublished) version |
| `-v, --verbose`         | `false`      | Print verbose debug output           |

**Examples:**

```bash
# Pull English translations as flat JSON
localess translation pull en --path ./locales/en.json

# Pull German translations as nested JSON
localess translation pull de --path ./locales/de.json --format nested

# Pull draft (unpublished) translations
localess translation pull en --path ./locales/en.json --draft
```

---

### `localess translation diff <locale>`

Read-only comparison between a local translations file and your Localess space. Groups keys into `Create`/`Update`/`Stale` sections (color-coded, git-diff style `+`/`~`/`-` symbols); unchanged keys collapse into a single count by default so drift stays visible even with thousands of translations. Exits `1` if anything differs (useful as a CI drift gate), `0` when everything is unchanged. Does not modify anything — use `push` to apply changes.

```bash
localess translation diff <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                                    |
|------------|------------------------------------------------|
| `<locale>` | ISO 639-1 locale code (e.g., `en`, `de`, `fr`) |

**Options:**

| Flag                    | Default      | Description                          |
|-------------------------|--------------|---------------------------------------|
| `-p, --path <path>`     | *(required)* | Path to the local translations file  |
| `-f, --format <format>` | `flat`       | File format: `flat` or `nested`      |
| `--draft`               | `false`      | Compare against the draft version    |
| `-a, --all`             | `false`      | Also print unchanged keys            |
| `-v, --verbose`         | `false`      | Print verbose debug output           |

**Examples:**

```bash
# Compare a local file against the space (exits 1 on drift)
localess translation diff en --path ./locales/en.json

# Also list unchanged keys
localess translation diff en --path ./locales/en.json --all

# CI drift gate
- run: localess translation diff en --path ./locales/en.json
```

---

## TypeScript Type Generation

### `localess type generate`

Fetch your space's schema definitions from Localess and generate TypeScript type definitions. The output file provides full type safety when working with Localess content in your TypeScript projects: one `interface` per `ROOT`/`NODE` schema (with `_id` and a literal `_schema` discriminator), a string-literal union per `ENUM` schema, the `ContentAsset`/`ContentLink`/`ContentReference`/`ContentRichText` helper types, and a `ContentData` union of all `ROOT` schemas.

```bash
localess type generate [--path <output_path>] [--prefix <prefix>]
```

**Options:**

| Flag                  | Default                   | Description                                             |
|-----------------------|---------------------------|---------------------------------------------------------|
| `-p, --path <path>`   | `.localess/localess.d.ts` | Path to write the generated TypeScript definitions file |
| `--prefix <prefix>`   | `''`                      | Prefix to prepend to all generated type names           |
| `-v, --verbose`       | `false`                   | Print verbose debug output                              |

> **Note:** Your API token must have **Development Tools** permission enabled in Localess Space settings.

**Example:**

```bash
# Generate types to the default location
localess type generate

# Generate types to a custom path
localess type generate --path src/types/localess.d.ts

# Prefix all generated type names (e.g. PascalCase namespacing to avoid collisions)
localess type generate --prefix Localess
# produces `LocalessPage`, `LocalessHeroBlock`, `LocalessContentAsset`, etc.
```

**Using generated types:**

```ts
import type { Page, HeroBlock } from './.localess/localess';
import { getLocalessClient } from "@localess/react";

const client = getLocalessClient();
const content = await client.getContentBySlug<Page>('home', { locale: 'en' });
// content.data is now fully typed as Page
```

---

## Schema Commands

Define Localess schemas in TypeScript with [`@localess/schema`](../schema/SKILL.md) (`defineSchema`/`defineEnum`/`defineConfig`) and sync them bidirectionally with your Localess space. Entry-file convention: a TS/JS file exporting the result of `defineConfig()` — by convention `schemas/index.ts`, but any path works.

> **Prerequisite:** Your API token must have the **Development Tools** permission (`DEV_TOOLS`) — same as `type generate`. No dedicated schema permission exists.

### `localess schema validate <entry>`

Offline — no login, no network call. Runs `@localess/schema`'s `validate()` against the entry's config and prints each issue (`ERROR`/`WARNING`, code, path, message). Exits `1` when any error-severity issue is present; `0` otherwise (warnings alone don't fail).

```bash
localess schema validate ./schemas/index.ts
localess schema validate ./schemas/index.ts --format json   # machine-readable, for CI
```

### `localess schema pull [--path <dir>]`

Fetches the space's schemas and (re)generates one TypeScript definition file per schema (kebab-case file name, e.g. `HeroBlock` → `hero-block.ts`) plus `index.ts` (a `defineConfig()` call) into `--path` (default `schemas`). Repeatable and safe to re-run — only ever overwrites/deletes files it previously generated (marked with a header comment); a same-named hand-written file without that marker is skipped and reported, and never overwritten.

```bash
localess schema pull
localess schema pull --path src/schemas
```

- Every field is emitted wrapped in `defineField(...)` (imported from `@localess/schema` alongside `defineSchema`), not as a bare object literal, so hand-edits to a pulled file still get `defineField`'s excess-property checking. Schemas with no fields import only `defineSchema`; `ENUM` schemas use `defineEnum`.
- Cross-schema references (`OPTION`/`OPTIONS` `source`, `SCHEMA`/`SCHEMAS` `schemas`) that point at another pulled schema become `import { X } from './x'` statements and by-value refs; ids not present in the pulled set stay plain strings.
- Output is deterministic — the same server state produces byte-identical files.

### `localess schema diff <entry>`

Read-only comparison between the entry's code-defined schemas and the space — same grouped/colored report format as `translation diff` (`Create`/`Update`/`Stale` sections, unchanged schemas collapsed into a count by default). Exits `1` if anything differs (CI drift gate), `0` when everything is unchanged.

```bash
localess schema diff ./schemas/index.ts
localess schema diff ./schemas/index.ts --all   # also list unchanged schemas
```

### `localess schema push <entry> [--dry-run] [--delete] [-a|--all] [-y|--yes]`

Validates, diffs, then pushes the entry's schemas to the space. The pre-push diff uses the same grouped/colored report as `schema diff` (`-a, --all` to also list unchanged schemas).

```bash
localess schema push ./schemas/index.ts --dry-run   # preview only
localess schema push ./schemas/index.ts             # upsert: create/update, never delete
localess schema push ./schemas/index.ts --delete    # sync: also delete schemas absent from code
localess schema push ./schemas/index.ts --delete -y # sync, skip the deletion confirmation prompt
```

- Aborts (exit `1`) without pushing if `validate()` reports any error (warnings are printed but don't block).
- Default mode is **upsert** — creates and updates, never deletes. Schemas on the server but absent from code are reported as `stale` and left alone.
- `--delete` switches to **sync** mode, which also deletes stale schemas. Without `--yes`, you're asked to confirm the exact list before anything is deleted; `--dry-run` skips the prompt (nothing is written either way), and no prompt is shown when nothing is stale.
- Prints the server's final counts: `created`, `updated`, `deleted`, `unchanged` (prefixed with `[DryRun]` under `--dry-run`).
- Reconciles the pre-push diff against the server's returned ids and prints a `⚠ Prediction mismatch` warning (without failing) for any schema whose predicted status differs from the server's actual outcome — e.g. a concurrent change made between the preview and the push. `stale` entries are only checked in sync mode, since upsert never sends them.

---

## Stored Files

| File                         | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| `.localess/credentials.json` | Stored login credentials (created by `localess login`, mode `0600`)         |
| `.localess/localess.d.ts`    | Generated TypeScript definitions (created by `localess type generate`)      |
| `schemas/*.ts`, `schemas/index.ts` | Generated schema definitions (created by `localess schema pull`; path via `--path`) |

> `localess login` appends `.localess` to `.gitignore` automatically. If you want to commit generated types, refine that entry to `.localess/credentials.json` afterwards.

---

## Update Notifications

Every command checks the npm registry for a newer `@localess/cli` version (3-second timeout, failures ignored silently) and, after the command finishes, prints an "Update available" box with the `npm install --save-dev @localess/cli@<tag>` command when one exists. Pre-release (`-dev.*`) installs also check the `dev` dist-tag; a newer stable release always wins over a newer dev build.

## API Errors

Any non-OK response from the Localess API is rendered as a boxed error (`Status`, optional `Code`, redacted `URL`, and a `Hint`) and the command exits `1`. `401` and `403` hints link directly to your space's token settings page and, for `403`, list the permission(s) the token is missing. Network errors and `5xx` responses are retried 3 times with a 500 ms delay before failing.

---

## AI Coding Agents

This package ships a [`SKILL.md`](./SKILL.md) file that provides AI coding agents (GitHub Copilot, Claude Code, Cursor, and others) with accurate, up-to-date APIs, patterns, and best practices. Most agents automatically read `SKILL.md` when starting a session.

### Using SKILL.md in your project

`SKILL.md` is included in the npm package, so it is available locally after installation. Reference it from your project's `AGENTS.md` to ensure your agent reads accurate Localess documentation every session:

```markdown
## Localess

@node_modules/@localess/cli/SKILL.md
```

The `@` prefix is the syntax used by most agent tools (GitHub Copilot, Claude Code, Cursor) to import file contents inline into the agent context.

When you change the public API of this package, update `SKILL.md` alongside your code:

- **New option or parameter** → add it to the relevant options table and usage example
- **Changed behaviour** → update the description and any affected code snippets
- **Deprecated API** → mark it clearly and point to the replacement
- **New command or subcommand** → add a full entry with all flags and examples

---

## License

[MIT](../../LICENSE)
