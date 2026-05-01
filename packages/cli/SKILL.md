# SKILL: @localess/cli

## Overview

`@localess/cli` is the **command-line interface** for the Localess headless CMS platform. It enables:

- Authenticating with a Localess instance
- Pushing and pulling translations (flat JSON; nested format supported for pull only)
- Generating TypeScript type definitions from the OpenAPI schema

**Status:** Early development (v3.0.1). Requires Node.js >= 20.0.0.

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

| Argument   | Description                         |
|------------|-------------------------------------|
| `<locale>` | ISO 639-1 locale code: `en`, `de`… |

**Options:**

| Flag                    | Default         | Description                                           |
|-------------------------|-----------------|-------------------------------------------------------|
| `-p, --path <path>`     | required        | Path to the translations JSON file                    |
| `-f, --format <format>` | `flat`          | File format: `flat` only (**nested not yet implemented**) |
| `-t, --type <type>`     | `add-missing`   | Update strategy: `add-missing` or `update-existing`   |
| `--dry-run`             | `false`         | Preview changes without applying them                 |

**Update Strategies:**

| Strategy           | Behaviour                                                  |
|--------------------|------------------------------------------------------------|
| `add-missing`      | Only adds keys that don't yet exist in Localess            |
| `update-existing`  | Only updates keys that already exist in Localess           |

**File Formats:**

*Flat (default — only supported format for push):*
```json
{
  "common.submit": "Submit",
  "nav.home": "Home",
  "errors.required": "This field is required"
}
```

> **⚠️ Nested format is not yet implemented for push.** Passing `--format nested` logs an error and exits without uploading. Use `flat` format only.

**Examples:**

```bash
# Basic push — add missing translations only
localess translations push en --path ./locales/en.json

# Update existing translations (don't add new)
localess translations push de --path ./locales/de.json --type update-existing

# Preview changes without applying
localess translations push fr --path ./locales/fr.json --dry-run
```

---

### Pull Translations

Download translations from Localess to a local JSON file.

```bash
localess translations pull <locale> --path <file> [options]
```

**Arguments:**

| Argument   | Description                         |
|------------|-------------------------------------|
| `<locale>` | ISO 639-1 locale code: `en`, `de`… |

**Options:**

| Flag                    | Default   | Description                          |
|-------------------------|-----------|--------------------------------------|
| `-p, --path <path>`     | required  | Output file path                     |
| `-f, --format <format>` | `flat`    | File format: `flat` or `nested`      |

**Examples:**

```bash
# Pull as flat JSON
localess translations pull en --path ./locales/en.json

# Pull as nested JSON
localess translations pull de --path ./locales/de.json --format nested
```

---

## Type Generation

Generate TypeScript type definitions from your Localess space's OpenAPI schema.

```bash
localess types generate [--path <output>]
```

**Options:**

| Flag                | Default                       | Description                   |
|---------------------|-------------------------------|-------------------------------|
| `-p, --path <path>` | `.localess/localess.d.ts`     | Output file path              |

> **Prerequisite:** The API token must have the **Development Tools** permission in Localess Space settings.

**What it does:**
1. Fetches the OpenAPI 3.0 spec from your space
2. Extracts schema components
3. Generates TypeScript `.d.ts` definitions with `openapi-typescript`

**Examples:**

```bash
# Default output to .localess/localess.d.ts
localess types generate

# Custom output path
localess types generate --path src/types/localess.d.ts
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
          node-version: '20'
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

| File                          | Created by                  | Permissions    | Purpose                        |
|-------------------------------|-----------------------------|----------------|--------------------------------|
| `.localess/credentials.json`  | `localess login`            | `0o600` (owner only) | Persisted auth credentials |
| `.localess/localess.d.ts`     | `localess types generate`   | Standard       | Generated TypeScript types     |

---

## Best Practices

1. **Use environment variables in CI/CD** — set `LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN` as secrets. No `login` command needed.

2. **Always dry-run before pushing translations** in automated scripts: add `--dry-run` first, inspect the output, then run without it.

3. **Commit generated types** (`.localess/localess.d.ts`) to your repo so the whole team benefits from type safety without running the CLI.

4. **Re-run `types generate` after any schema change** in the Localess CMS to keep types in sync.

5. **Use `add-missing` strategy (default)** for initial import of translations; switch to `update-existing` when syncing copy changes.

6. **Never commit `.localess/credentials.json`** — `localess login` automatically adds `.localess` to `.gitignore`, so credentials are protected out of the box.

7. **Give the token minimum required permissions** — the `types generate` command needs "Development Tools" permission; other commands only need standard API access.
