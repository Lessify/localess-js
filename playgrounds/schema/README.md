# Localess + Schema

A backend-free look at `@localess/schema`, plus the CLI round-trip once you're ready to push to a real space.

## What this demonstrates

- **Authoring schemas in code**: `src/schemas/` (itself pulled from a real space — see below) defines a `ButtonType` enum, a `Button` NODE, a `Section` NODE, and a `Page` ROOT with `defineEnum`/`defineSchema`/`defineConfig`. Every field uses `defineField` — optional, and the only way to get a compile error on a stray property from the wrong field kind. `Button.type` and `Page.buttons` use by-value refs (`source: ButtonType`, `schemas: [Button]`), which `defineSchema` normalizes to id strings while inference keeps the literal ids.
- **Extracting a real TypeScript type straight from the definition** — `src/extract-example.ts` uses `InferContent`/`InferContentData` to derive `PageContent`/`ButtonContent`/`ContentData`, then checks a **real, verbatim response body from `GET /content/{slug}`** against `Content<PageContent>` (from `@localess/model`) — proving the inferred types actually match what the live API returns. This is checked by `tsc` alone; no Localess account or network call is needed to prove the types are correct. Two things the real payload has that aren't modeled yet by `@localess/model` (a top-level `locale`, a legacy `schema` alongside every block's `_schema`) are called out in a comment rather than silently dropped. The rich-text `content` field is precisely typed against `@localess/richtext`'s `LocalessRichTextDocument` — `@localess/model`'s own `ContentRichText` is a deliberately loose placeholder, not meant for authoring (see `docs/richtext.md`).
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
| `src/schemas/*.ts`           | `defineEnum`/`defineSchema`/`defineField`/`defineConfig` (this dir mirrors a real `schema:pull` output) |
| `src/extract-example.ts`     | `InferContent`/`InferContentData`, plus a real API response checked against `Content<PageContent>` and `LocalessRichTextDocument` |
| `src/schemas/pulled/`        | Output of `npm run schema:pull` — one generated file per schema plus an `index.ts` `defineConfig`, all using `defineField`. Regenerated on every pull; excluded from `npm run check` (see `tsconfig.json`), as is the generated `src/localess.types.ts` |

## Learn more

- [`@localess/schema` docs](https://github.com/Lessify/localess-js/blob/main/docs/schema.md)
- [`@localess/cli` docs](https://github.com/Lessify/localess-js/blob/main/docs/cli.md)
