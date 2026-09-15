<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# @localess/schema

Define your [Localess](https://github.com/Lessify/localess) content schemas **in TypeScript**, keep them in version control, and get the content types of every schema inferred for free.

Instead of clicking a content model together in the Studio UI and then hand-writing matching interfaces that drift, you write the schema once. `@localess/cli` pushes it to your space, and `InferContent` derives the exact shape `getContentBySlug()` will return — including nested blocks and enum unions.

**Zero external dependencies** — `@localess/model` is the only entry in `dependencies`. See [ADR 008](../../docs/decisions/008-schema-package.md).

## Requirements

- Node.js >= 24.0.0

## Installation

```bash
# npm
npm install @localess/schema
npm install --save-dev @localess/cli

# yarn
yarn add @localess/schema && yarn add -D @localess/cli

# pnpm
pnpm add @localess/schema && pnpm add -D @localess/cli
```

---

## Defining a schema

Straight from the [schema playground](../../playgrounds/schema). An enum, a reusable block, and a root document that nests it:

```ts
// schemas/button-type.ts
import { defineEnum } from '@localess/schema';

export const ButtonType = defineEnum({
  id: 'ButtonType',
  displayName: 'Button Type',
  description: 'It will define the visual part of a button.',
  labels: ['button'],
  values: [
    { name: 'Primary', value: 'primary' },
    { name: 'Secondary', value: 'secondary' },
  ],
});
```

```ts
// schemas/button.ts
import { defineField, defineSchema } from '@localess/schema';
import { ButtonType } from './button-type';

export const Button = defineSchema({
  id: 'Button',
  type: 'NODE',
  displayName: 'Button',
  description: 'A button',
  previewField: 'label',
  fields: [
    defineField({
      name: 'label',
      kind: 'TEXT',
      displayName: 'Label',
      required: true,
      translatable: true,
      defaultValue: 'CTA',
      minLength: 3,
      maxLength: 30,
    }),
    defineField({ name: 'type', kind: 'OPTION', displayName: 'Type', required: true, source: ButtonType }),
  ],
});
```

```ts
// schemas/page.ts
import { defineField, defineSchema } from '@localess/schema';
import { Button } from './button';

export const Page = defineSchema({
  id: 'Page',
  type: 'ROOT',
  displayName: 'Page',
  fields: [
    defineField({ name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true }),
    defineField({ name: 'description', kind: 'TEXTAREA', displayName: 'Description', translatable: true }),
    defineField({ name: 'buttons', kind: 'SCHEMAS', displayName: 'Buttons', schemas: [Button] }),
    defineField({ name: 'content', kind: 'RICH_TEXT', displayName: 'Content', translatable: true }),
  ],
});
```

Collect them into a config — this is the file the CLI reads:

```ts
// schemas/index.ts
import { defineConfig } from '@localess/schema';
import { Button } from './button';
import { ButtonType } from './button-type';
import { Page } from './page';

export const config = defineConfig({ schemas: [Button, ButtonType, Page] });
```

`type: 'ROOT'` marks a schema that can be a document of its own; `type: 'NODE'` is a block only usable inside another schema.

---

## Inferring content types

This is the payoff — no hand-written interfaces:

```ts
import type { InferContent, InferContentData } from '@localess/schema';
import { Page } from './schemas/page';
import { config } from './schemas';

/** Unions the content type of every ROOT schema — type a page-fetching function with this. */
export type ContentData = InferContentData<typeof config>;

/** Resolves a single schema, `SCHEMAS`/`SCHEMA` references included. */
export type PageContent = InferContent<typeof Page, typeof config>;
```

`PageContent` now has `title: string`, `buttons: ButtonContent[]`, and `type: 'primary' | 'secondary'` on each button — the enum narrowed to a literal union, resolved through the nesting. Change `minLength` in the schema and nothing breaks; rename a field and every call site fails to compile.

Use it with the client:

```ts
const content = await client.getContentBySlug<PageContent>('home', { locale: 'en' });
content.data.buttons[0].type; // 'primary' | 'secondary'
```

`InferEnum<typeof ButtonType>` gives you the value union on its own.

---

## Validating before you push

`validate(config)` checks ids, field constraints and cross-schema references locally — no network:

```ts
import { validate } from '@localess/schema';
import { config } from './schemas';

const result = validate(config);
// → { ok: true, issues: [] }

if (!result.ok) {
  for (const issue of result.issues) {
    console.error(`${issue.severity} ${issue.code} at ${issue.path}: ${issue.message}`);
  }
}
```

Each issue carries `severity` (`'error' | 'warning'`), a stable `code` such as `schema/invalid-id`, the `path` to the offending schema or field, and a human-readable `message`.

`toSchemaExport(config)` produces the wire format the API accepts, if you'd rather push it yourself than use the CLI.

---

## The CLI workflow

[`@localess/cli`](../cli) drives the round trip. From the playground's `package.json`:

```jsonc
{
  "scripts": {
    "schema:validate": "localess schema validate ./src/schemas/index.ts",
    "schema:diff":     "localess schema diff ./src/schemas/index.ts",
    "schema:push":     "localess schema push ./src/schemas/index.ts",
    "schema:pull":     "localess schema pull --path ./src/schemas/pulled",
    "localess:types":  "localess type generate --path ./src/localess.types.ts"
  }
}
```

`diff` shows what a push would change before it changes it. `pull` goes the other way, generating these definitions from a space you already modelled in the UI — useful for adopting schemas-as-code on an existing project.

---

## Field kinds

`TEXT`, `TEXTAREA`, `MARKDOWN`, `RICH_TEXT`, `NUMBER`, `COLOR`, `DATE`, `DATETIME`, `BOOLEAN`, `OPTION`, `OPTIONS`, `LINK`, `REFERENCE`, `REFERENCES`, `ASSET`, `ASSETS`, `SCHEMA`, `SCHEMAS`.

Each kind accepts its own options — `minLength`/`maxLength` on text, `source` on `OPTION`, `schemas` on `SCHEMA`/`SCHEMAS`, `fileTypes` on assets — and `defineField` is typed per kind, so an option that doesn't belong is a compile error rather than a runtime surprise.

---

## Related

- [`@localess/cli`](../cli) — push, pull, diff, validate, and type generation
- [`@localess/model`](../model) — the wire types this package emits
- [docs/schema.md](../../docs/schema.md) — full reference for every field kind and inference rule
- [CONTRIBUTING.md](./CONTRIBUTING.md) — adding a field kind

## License

See the [Localess](https://github.com/Lessify/localess) repository.
