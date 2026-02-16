<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess Command Line

A powerful CLI tool to interact with your Localess spaces.

## Features

- 🔐 **Authentication** - Secure login system and CI environments.
- 🛡️ **Type Safety** - Generate TypeScript type definitions for your Localess content schemas, ensuring type safety in your frontend applications.
- 🌐 **Translations** - Sync and manage translations for your Localess space.

## Setup

```bash
npm install @localess/cli -D
```

## Login
The CLI provides a `login` command to authenticate with your Localess account. This command prompts you for your email and password, and securely stores an authentication token for future API requests.
### Usage

#### Login with your Localess from CLI:
```bash
localess login --origin <localess_api_origin> --space <space_id> --token <space_access_token>
```
#### Login with your Localess with environment variables:
```bash
export LOCALESS_ORIGIN=<localess_api_origin>
export LOCALESS_SPACE=<space_id>
export LOCALESS_TOKEN=<space_access_token>  
localess login
```

## Logout
The CLI provides a `logout` command to clear your authentication token and log you out of your Localess account.
### Usage
```bash
localess logout
```

## Generate TypeScript Types

The CLI provides a `types` command to generate TypeScript definitions for your Localess content schemas. This command fetches your space's OpenAPI schema and writes a `localess.d.ts` file to your project, allowing for strong typing in your codebase.

### Usage

```bash
localess types
```

- You must be logged in (`localess login`) before running this command.
- The generated types file will be saved as `./.localess/localess.d.ts` in your current working directory.

You can then import these types in your TypeScript project for improved type safety when working with Localess content.
