# Localess JavaScript/TypeScript SDK — Claude Code Context

This monorepo contains the JavaScript/TypeScript SDKs for the [Localess](https://github.com/Lessify/localess) headless CMS platform.

## Repository Structure

npm workspaces monorepo with three packages:

| Package | Path | Description |
|---------|------|-------------|
| `@localess/client` | `packages/client/` | Core server-side SDK (requires API token) |
| `@localess/react` | `packages/react/` | React integration — components, hooks, rich text, visual editor |
| `@localess/cli` | `packages/cli/` | CLI for translations and type generation (early stage) |

## Package Dependencies

```
@localess/cli ──┐
                ├──> @localess/client
@localess/react ┘
```

Use workspace protocol `"*"` for internal dependencies.

## Build

```bash
npm run build            # all packages in order
npm run build:client
npm run build:react
npm run build:cli
```

All packages use `tsup`:
- `@localess/client`, `@localess/react`: `tsup src/index.ts --format cjs,esm --dts`
- `@localess/cli`: `tsup src/index.ts --format cjs,esm --dts --shims`

## Tests

Tests only exist in `@localess/cli`:

```bash
npm test --workspace=@localess/cli
npx vitest run packages/cli/src/commands/login/login.test.ts
```

## Requirements

- Node.js >= 20.0.0
- TypeScript 5.x

---

## Package: @localess/client

**Server-side only.** Zero production dependencies.

**Key files:**
- `src/client.ts` — API methods (`getContentBySlug`, `getContentById`, `getLinks`, `getTranslations`)
- `src/cache.ts` — TTL-based cache (default 5 min / 300 000 ms)
- `src/editable.ts` — `localessEditable`, `localessEditableField` helpers
- `src/sync.ts` — `loadLocalessSync` script injector
- `src/models/` — TypeScript type definitions

**Init:**
```typescript
const client = localessClient({
  origin: 'https://my-localess.web.app',
  spaceId: 'SPACE_ID',
  token: 'API_TOKEN',       // ⚠️ KEEP SECRET — server-side only
  version?: 'draft',        // default: 'published'
  debug?: boolean,
  cacheTTL?: number | false  // default: 300000ms; false = disable
});
```

**API methods:** `getContentBySlug<T>`, `getContentById<T>`, `getLinks`, `getTranslations`, `getOpenAPI`

**Content fetch params:** `version`, `locale`, `resolveReference`, `resolveLink`

For the full API see `packages/client/SKILL.md`.

---

## Package: @localess/react

React integration layer built on `@localess/client`.

**Key files:**
- `src/index.ts` — barrel re-exports
- `src/state.ts` — global state: client instance, component registry, sync flag, asset prefix
- `src/components/localess-component.tsx` — `<LocalessComponent>` dynamic renderer
- `src/hooks/use-localess.ts` — `useLocaless<T>` React hook
- `src/utils/link.util.ts` — `findLink()` utility
- `src/richtext.ts` — `renderRichTextToReact()` using TipTap
- `src/models/options.ts` — `LocalessOptions` type

**Init (call once in root layout):**
```typescript
localessInit({
  origin: process.env.LOCALESS_ORIGIN!,
  spaceId: process.env.LOCALESS_SPACE_ID!,
  token: process.env.LOCALESS_TOKEN!,
  enableSync: process.env.NODE_ENV !== 'production',
  components: { 'page': Page, 'hero-section': Hero },
  fallbackComponent: UnknownBlock,
});
```

**`useLocaless<T>` hook** — client-side content fetch with auto Visual Editor sync:
```typescript
const content = useLocaless<Page>(slug, { locale: 'en' });
// slug: string | string[] (array joined with '/')
// returns Content<T> | undefined
```

**`findLink(links, link)`** — resolves `ContentLink` → URL string:
```typescript
const href = findLink(content.links, data.ctaLink);
// 'content' type → '/' + fullSlug  |  'url' type → raw URI
```

**`<LocalessComponent>`** — maps `data._schema` to registered component, pure renderer:
```tsx
<LocalessComponent data={item} links={content.links} references={content.references} />
```

**`<LocalessDocument>`** — component alternative to `useLocaless`. Accepts server-fetched `data` and handles live sync internally. Does not fetch content itself:
```tsx
<LocalessDocument data={content.data} links={content.links} references={content.references} />
```

**`renderRichTextToReact(content)`** — TipTap JSON → React nodes.

**`resolveAsset(asset)`** — `ContentAsset` → full URL.

**Editable helpers (Visual Editor):**
```tsx
<section {...localessEditable(data)}>
  <h1 {...localessEditableField<Page>('title')}>{data.title}</h1>
</section>
```

For the full API see `packages/react/SKILL.md`.

---

## Package: @localess/cli

Commander.js CLI. Entry point: `src/index.ts` (shebang `#!/usr/bin/env node`).

**Commands:**
- `login --origin <url> --space <id> --token <token>` — saves to `.localess/credentials.json`
- `logout` — clears credentials
- `translations push <locale> --path <file> [--format flat] [--type add-missing|update-existing] [--dry-run]`
- `translations pull <locale> --path <file> [--format flat|nested]`
- `types generate [--path <output>]` — generates `.localess/localess.d.ts` from OpenAPI schema

**Credentials priority:** env vars (`LOCALESS_ORIGIN`, `LOCALESS_SPACE`, `LOCALESS_TOKEN`) > `.localess/credentials.json`

For the full CLI reference see `packages/cli/SKILL.md`.

---

## Content Data Model

```typescript
Content<T extends ContentData>   // response wrapper with .data, .links, .references
ContentData                      // base: _id, _schema, + your fields
ContentAsset                     // { kind: 'ASSET', uri: string }
ContentLink                      // { kind: 'LINK', type: 'url'|'content', uri, target }
ContentRichText                  // TipTap JSON node tree
Links                            // { [contentId]: ContentMetadata }
```

## Key Conventions

- **Schema keys** must match Localess CMS config — use lowercase hyphenated names: `'hero-section'`, `'card-grid'`
- **Module exports** — dual CJS + ESM via `tsup`
- **TypeScript** — `target: ESNext`, `moduleResolution: Bundler`, `strict: true`, `noImplicitAny: false`
- **Never expose API token client-side** — use only in Server Components, API routes, loaders
- **`enableSync: false` in production** — sync script is only meaningful inside the Localess Visual Editor iframe
- **`window.localess`** only exposes `.on()` and `.onChange()` — no `.off()`

## Versions

- `@localess/client`: v3.0.1
- `@localess/react`: v3.0.1
- `@localess/cli`: v3.0.1

## Documentation Files

Each package ships a `SKILL.md` consumed by AI coding agents:

```
packages/client/SKILL.md   — @localess/client full API reference
packages/react/SKILL.md    — @localess/react full API reference
packages/cli/SKILL.md      — @localess/cli full command reference
```

Reference them from your project's `CLAUDE.md` or `AGENTS.md`:

```markdown
@node_modules/@localess/react/SKILL.md
```
