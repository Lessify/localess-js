<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess CLI

The `@localess/cli` package is the official command-line interface for the [Localess](https://github.com/Lessify/localess) headless CMS platform. It provides commands to authenticate with your Localess instance, synchronize translations, and generate TypeScript type definitions from your content schemas.

## Requirements

- Node.js >= 20.0.0

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
- 🌐 **Translations** — Push and pull translation files to/from your Localess space
- 🛡️ **Type Generation** — Generate TypeScript type definitions from your Localess content schemas for end-to-end type safety

---

## Authentication

### `localess login`

Authenticate with your Localess instance. Credentials are validated immediately and stored securely in `.localess/credentials.json` with restricted file permissions (`0600`).

```bash
localess login --origin <origin> --space <space_id> --token <api_token>
```

If any option is omitted, the CLI will interactively prompt for the missing values.

**Options:**

| Flag | Description |
|------|-------------|
| `-o, --origin <origin>` | Localess instance URL (e.g., `https://my-localess.web.app`) |
| `-s, --space <space>` | Space ID (found in Localess Space settings) |
| `-t, --token <token>` | API token (input is masked for security) |

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

localess translations pull en --path ./public/locales/en.json
```

| Variable | Description |
|----------|-------------|
| `LOCALESS_ORIGIN` | Localess instance URL |
| `LOCALESS_SPACE` | Space ID |
| `LOCALESS_TOKEN` | API token |

---

### `localess logout`

Clear stored credentials from `.localess/credentials.json`.

```bash
localess logout
```

> If you authenticated via environment variables, those must be unset manually — `logout` only affects file-based credentials.

---

## Translations Management

### `localess translations push <locale>`

Push a local JSON translation file to your Localess space. Only keys present in the file are affected, based on the selected update type.

```bash
localess translations push <locale> --path <file> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<locale>` | ISO 639-1 locale code (e.g., `en`, `de`, `fr`) |

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --path <path>` | *(required)* | Path to the JSON translations file |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |
| `-t, --type <type>` | `add-missing` | Update strategy: `add-missing` or `update-existing` |
| `--dry-run` | `false` | Preview changes without applying them |

**Update Strategies:**

| Type | Description |
|------|-------------|
| `add-missing` | Adds translations for keys that do not yet exist in Localess |
| `update-existing` | Updates translations for keys that already exist in Localess |

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
localess translations push en --path ./locales/en.json

# Push with update-existing strategy
localess translations push en --path ./locales/en.json --type update-existing

# Preview changes without applying (dry run)
localess translations push en --path ./locales/en.json --dry-run

# Push nested-format translations
localess translations push de --path ./locales/de.json --format nested
```

---

### `localess translations pull <locale>`

Pull translations from your Localess space and save them to a local file.

```bash
localess translations pull <locale> --path <file> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<locale>` | ISO 639-1 locale code (e.g., `en`, `de`, `fr`) |

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --path <path>` | *(required)* | Output file path |
| `-f, --format <format>` | `flat` | File format: `flat` or `nested` |

**Examples:**

```bash
# Pull English translations as flat JSON
localess translations pull en --path ./locales/en.json

# Pull German translations as nested JSON
localess translations pull de --path ./locales/de.json --format nested
```

---

## TypeScript Type Generation

### `localess types generate`

Fetch your space's OpenAPI schema from Localess and generate TypeScript type definitions. The output file provides full type safety when working with Localess content in your TypeScript projects.

```bash
localess types generate [--path <output_path>]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --path <path>` | `.localess/localess.d.ts` | Path to write the generated TypeScript definitions file |

> **Note:** Your API token must have **Development Tools** permission enabled in Localess Space settings.

**Example:**

```bash
# Generate types to the default location
localess types generate

# Generate types to a custom path
localess types generate --path src/types/localess.d.ts
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

## Stored Files

| File | Description |
|------|-------------|
| `.localess/credentials.json` | Stored login credentials (created by `localess login`) |
| `.localess/localess.d.ts` | Generated TypeScript definitions (created by `localess types generate`) |

> It is recommended to add `.localess/credentials.json` to your `.gitignore` to avoid committing sensitive credentials.

---

## License

[MIT](../../LICENSE)
