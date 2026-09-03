# @localess/cli Reference

Command-line interface for the Localess headless CMS. Handles authentication, translation sync, and TypeScript type generation.

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

What it does:
1. Checks for existing credentials (env vars or file)
2. Prompts interactively for any missing options
3. Validates credentials against the API
4. Saves credentials to `.localess/credentials.json` (mode `0o600`)
5. Appends `.localess` to `.gitignore` automatically (creates the file if absent)

### `localess logout`

```bash
localess logout
```

Clears `.localess/credentials.json`. If authenticated via environment variables, instructs you to unset them manually.

## Credential Resolution

Credentials are resolved in this priority order:

1. **Environment variables** (highest priority — recommended for CI/CD)
2. **`.localess/credentials.json`** (file-based — for local development)

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

Upload a local JSON translation file to Localess.

```bash
localess translation push <locale> --path <file> [options]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | required | Path to the translations JSON file |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |
| `-t, --type <type>` | `add-missing` | Update strategy (see below) |
| `--dry-run` | `false` | Preview changes without applying |

### Update strategies

| Strategy | Behaviour |
|---|---|
| `add-missing` | Only adds keys absent from Localess |
| `update-existing` | Only updates keys already in Localess |
| `delete-missing` | Deletes Localess keys absent from the local file |

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

Download translations from Localess to a local JSON file.

```bash
localess translation pull <locale> --path <file> [options]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | required | Output file path |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |

```bash
localess translation pull en --path ./locales/en.json
localess translation pull de --path ./locales/de.json --format nested
```

## `localess type generate`

Generate TypeScript type definitions from your Localess space's schemas.

```bash
localess type generate [--path <output>]
```

| Flag | Default | Description |
|---|---|---|
| `-p, --path <path>` | `.localess/localess.d.ts` | Output file path |

> **Prerequisite:** The API token must have the **Development Tools** permission in Localess Space settings.

What it does:
1. Fetches the schema definitions from your space
2. Generates TypeScript `.d.ts` definitions for each schema

```bash
localess type generate
localess type generate --path src/types/localess.d.ts
```

Generated output:
```typescript
// .localess/localess.d.ts (auto-generated — do not edit)
export type Page = {
  _id: string;
  _schema: string;
  title: string;
  body: (HeroSection | CardGrid | RichTextBlock)[];
};
```

Using generated types:
```typescript
import type { Page } from './.localess/localess';
const content = await client.getContentBySlug<Page>('home');
```

## Schema Commands

Define schemas in TypeScript with `@localess/schema` (`defineSchema`/`defineEnum`/`defineConfig`) and sync them with a space. See [docs/schema.md](schema.md) for the authoring API.

Entry file: a TS/JS file exporting the result of `defineConfig()` (convention: `schemas/index.ts`).

> **Prerequisite:** The token needs the **Development Tools** permission (`DEV_TOOLS`) — same as `types generate`. No dedicated schema permission exists.

### `localess schema validate <entry>`

Offline — no login, no network. Prints each `validate()` issue; exits `1` on any error-severity issue.

```bash
localess schema validate ./schemas/index.ts
localess schema validate ./schemas/index.ts --format json
```

### `localess schema pull [--path <dir>]`

(Re)generates one TS definition file per schema plus `index.ts` from the space, into `--path` (default `schemas`). Repeatable: only overwrites/deletes files it previously generated (marked with a header comment); hand-written files without that marker are left alone.

```bash
localess schema pull
localess schema pull --path src/schemas
```

### `localess schema diff <entry>`

Read-only: prints `create`/`update`/`unchanged`/`stale` per schema. Exits `1` on any drift — use as a CI gate.

```bash
localess schema diff ./schemas/index.ts
```

### `localess schema push <entry> [--dry-run] [--delete] [-y]`

Validates, diffs, then pushes.

```bash
localess schema push ./schemas/index.ts --dry-run   # preview
localess schema push ./schemas/index.ts             # upsert: create/update only
localess schema push ./schemas/index.ts --delete    # sync: also delete schemas absent from code (confirms unless -y)
```

Aborts without pushing if validation fails. Prints the server's `created`/`updated`/`deleted`/`unchanged` counts.

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
        with: { node-version: '20' }
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
| `.localess/localess.d.ts` | `localess type generate` | Standard | Generated TypeScript types |

## .gitignore Notes

`localess login` automatically appends `.localess` to `.gitignore`. To commit generated types while protecting credentials:

```gitignore
.localess/credentials.json
# .localess/localess.d.ts  ← uncomment if regenerating in CI instead of committing
```
