# Localess + Schema

A backend-free look at `@localess/schema`, plus the CLI round-trip once you're ready to push to a real space.

## What this demonstrates

- **Authoring schemas in code**: `src/schemas/index.ts` defines a `Status` enum, a `Button` NODE, and a `Page` ROOT with `defineEnum`/`defineSchema`/`defineConfig`. Every field uses `defineField` — optional, and the only way to get a compile error on a stray property from the wrong field kind (try adding `maxLength` to `label`).
- **Extracting a real TypeScript type straight from the definition** — `src/extract-example.ts` uses `InferContent`/`InferContentData` to derive `PageContent`/`ButtonContent`/`ContentData`. This is checked by `tsc` alone; no Localess account or network call is needed to prove the types are correct.
- **The CLI round-trip against a real space**: `schema validate`/`diff`/`push`/`pull`, and the CLI's own `type generate` — a *different*, server-driven way to get types (codegen from whatever's live on the server, for teams not using `@localess/schema`'s programmatic definitions). For the same schemas, both paths should produce equivalent shapes.

## Run it (no backend needed)

```bash
npm install
npm run check           # tsc --noEmit — verifies the schemas and extracted types compile
npm run extract:example # runs extract-example.ts and prints the example content
```

## Point it at your own Localess space

```bash
npm run localess:login
npm run schema:validate  # authoring-rule checks (patterns, reserved names, reference resolution)
npm run schema:diff      # preview what would change on the server
npm run schema:push      # push Status/Button/Page to your space
npm run schema:pull      # pull whatever's live on the server back into src/schemas/pulled
npm run localess:types   # generate src/localess.types.ts from the server's schemas
```

## Key files

| File                         | Shows                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `src/schemas/index.ts`       | `defineEnum`/`defineSchema`/`defineField`/`defineConfig`       |
| `src/extract-example.ts`     | `InferContent`/`InferContentData` — compile-time type extraction |

## Learn more

- [`@localess/schema` docs](https://github.com/Lessify/localess-js/blob/main/docs/schema.md)
- [`@localess/cli` docs](https://github.com/Lessify/localess-js/blob/main/docs/cli.md)
