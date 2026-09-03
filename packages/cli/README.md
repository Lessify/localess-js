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

If any option is omitted, the CLI will interactively prompt for the missing values.

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

For CI/CD pipelines, you can provide credentials through environment variables instead of running `localess login`. The CLI automatically reads these variables and skips the file-based credentials:

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

Clear stored credentials from `.localess/credentials.json`.

```bash
localess logout
```

> If you authenticated via environment variables, those must be unset manually — `logout` only affects file-based credentials.

---

## Translations Management

> `localess translation` was previously `localess translations`, and `localess type` was `localess types`. The old plural names still work as aliases for backward compatibility.

### `localess translation push <locale>`

Push a local JSON translation file to your Localess space. Only keys present in the file are affected, based on the selected update type.

```bash
localess translation push <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                                    |
|------------|------------------------------------------------|
| `<locale>` | ISO 639-1 locale code (e.g., `en`, `de`, `fr`) |

**Options:**

| Flag                    | Default       | Description                                                            |
|-------------------------|---------------|------------------------------------------------------------------------|
| `-p, --path <path>`     | *(required)*  | Path to the JSON translations file                                     |
| `-f, --format <format>` | `flat`        | File format: `flat` or `nested`                                        |
| `-t, --type <type>`     | `add-missing` | Update strategy: `add-missing`, `update-existing`, or `delete-missing` |
| `--dry-run`             | `false`       | Preview changes without applying them                                  |
| `-v, --verbose`         | `false`       | Print verbose debug output                                             |

**Update Strategies:**

| Type              | Description                                                                   |
|-------------------|-------------------------------------------------------------------------------|
| `add-missing`     | Adds translations for keys that do not yet exist in Localess                  |
| `update-existing` | Updates translations for keys that already exist in Localess                  |
| `delete-missing`  | Deletes translations in Localess for keys that are absent from the local file |

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

# Push with update-existing strategy
localess translation push en --path ./locales/en.json --type update-existing

# Delete keys in Localess absent from the local file
localess translation push en --path ./locales/en.json --type delete-missing

# Preview changes without applying (dry run)
localess translation push en --path ./locales/en.json --dry-run

# Push nested-format translations
localess translation push de --path ./locales/de.json --format nested
```

---

### `localess translation pull <locale>`

Pull translations from your Localess space and save them to a local file.

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

Fetch your space's schema definitions from Localess and generate TypeScript type definitions. The output file provides full type safety when working with Localess content in your TypeScript projects.

```bash
localess type generate [--path <output_path>]
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

Fetches the space's schemas and (re)generates one TypeScript definition file per schema plus `index.ts` (a `defineConfig()` call) into `--path` (default `schemas`). Repeatable and safe to re-run — only ever overwrites/deletes files it previously generated (marked with a header comment); hand-written files without that marker are left untouched.

```bash
localess schema pull
localess schema pull --path src/schemas
```

### `localess schema diff <entry>`

Read-only comparison between the entry's code-defined schemas and the space — same grouped/colored report format as `translation diff` (`Create`/`Update`/`Stale` sections, unchanged schemas collapsed into a count by default). Exits `1` if anything differs (CI drift gate), `0` when everything is unchanged.

```bash
localess schema diff ./schemas/index.ts
localess schema diff ./schemas/index.ts --all   # also list unchanged schemas
```

### `localess schema push <entry> [--dry-run] [--delete] [-y|--yes]`

Validates, diffs, then pushes the entry's schemas to the space.

```bash
localess schema push ./schemas/index.ts --dry-run   # preview only
localess schema push ./schemas/index.ts             # upsert: create/update, never delete
localess schema push ./schemas/index.ts --delete    # sync: also delete schemas absent from code
localess schema push ./schemas/index.ts --delete -y # sync, skip the deletion confirmation prompt
```

- Aborts (exit `1`) without pushing if `validate()` reports any error.
- Default mode is **upsert** — creates and updates, never deletes. Schemas on the server but absent from code are reported as `stale` and left alone.
- `--delete` switches to **sync** mode, which also deletes stale schemas. Without `--yes`, you're asked to confirm the exact list before anything is deleted.
- Prints the server's final counts: `created`, `updated`, `deleted`, `unchanged`.

---

## Stored Files

| File                         | Description                                                             |
|------------------------------|-------------------------------------------------------------------------|
| `.localess/credentials.json` | Stored login credentials (created by `localess login`)                  |
| `.localess/localess.d.ts`    | Generated TypeScript definitions (created by `localess type generate`) |

> It is recommended to add `.localess/credentials.json` to your `.gitignore` to avoid committing sensitive credentials.

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
