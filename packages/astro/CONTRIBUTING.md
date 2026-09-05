# Contributing to @localess/astro

Astro integration layer. Depends on `@localess/client`, `@localess/model`, and `@localess/richtext` (plus `camelcase` and `morphdom`). Components never fetch data — they accept server-fetched data as props, same rule as `@localess/react`.

## Package boundaries

`@localess/client` is an implementation detail of this package. Consumer-facing code (playgrounds, docs, examples, and the code this package *generates* into the consumer's build — `virtual:localess-init`, `virtual:import-localess-components`, the injected `page` scripts) must only ever import from `@localess/astro` — never `@localess/client` directly. If a consumer needs something from `@localess/client` that isn't re-exported yet, add it to `src/index.ts`'s re-exports rather than telling consumers to import `@localess/client` themselves.

**The client-import boundary.** This package follows `CLAUDE.md` rule 7. Exactly two locations import `@localess/client` directly, and `src/import-boundary.test.ts` fails the build if a third appears:

- `src/index.ts` — the public re-exports (`localessClient`, `LocalessApiError`, `loadLocalessSync`, `localessEditable`, `localessEditableField`, `isBrowser`, `isIframe`, and the sync event types). This is the sanctioned pass-through to consumers, and it is **load-bearing**: the generated `virtual:localess-init` module imports `localessClient` from `@localess/astro`, so this re-export must not be "cleaned up". There is a test asserting the generated code never references `@localess/client`.
- `src/models/**` — the models module. `src/models/index.ts` re-exports the client types the package needs (`EventToApp`, `LocalessClient`, `LocalessClientOptions`); `src/models/client.ts` builds `LocalessOptions` on top of `LocalessClientOptions`. **Model types come from `@localess/model`**, never via the client's re-export — the guard test checks this separately.

Everything else reaches the client through `'../models'` (types) or `'../'` (functions). Note the package uses two of rule 7's three roles: there is no `utils` module and no client file, because there is no `localessClient(...)` call in TypeScript source — the client is constructed inside the generated `virtual:localess-init` module. The `.astro` components import `localessEditable`/`toCamelCase` from `'../'` and types from `'../models'`.

For `@localess/richtext` (ADR 007), exactly two files import it: **`src/richtext.ts`** (the pass-through re-export of `renderRichTextToHtml`, its `renderLocalessRichTextToHtml` alias, and the `LocalessRichTextInput`/`LocalessRichTextRenderers`/`LocalessRichTextHtmlOptions` types; `LocalessRichText.astro` imports through `../richtext`) and **`src/models/index.ts`** (richtext model *types* only). Note that `src/index.ts` only re-exports the two functions from `./richtext`, so `LocalessRichTextRenderers`/`LocalessRichTextHtmlOptions` are not currently part of the public surface.

## Adding a New Component

**1. Create `src/components/<Name>.astro`:**

```astro
---
import { localessEditable } from '../';
import type { LocalessSchemaProps } from '../models';

export type Props = LocalessSchemaProps; // or LocalessSchemaProps<YourContentType>

const { data, links, references, assets, ...restProps } = Astro.props;
---

<div {...localessEditable(data)} {...restProps}>
  {/* render data fields here */}
</div>
```

Rules:
- Always spread `{...localessEditable(data)}` on the root element — it adds `data-ll-id` and `data-ll-schema` for Visual Editor targeting (harmless no-op when sync is disabled).
- Always spread `{...restProps}` on the root element so `class`, etc. pass through.
- Accept `links`, `references`, and `assets` as optional props and forward them to any nested `LocalessComponent` instances.
- Never call `getLocalessClient()` or fetch data inside a component.
- Type props with `LocalessSchemaProps<T>` from `../models` (same generic shape `@localess/react` uses), passing a real content type as `T` — never `unknown` or an ad hoc inline shape. Reserve `LocalessComponentProps` for the built-in `LocalessComponent` renderer itself. A component's props are the contract for what data it expects; typing them loosely just pushes the "what shape is this?" question onto every caller. Components that aren't schema components (e.g. `LocalessDocument`, `LocalessRichText`) declare their own `Props` interface using model types (`Content`, `LocalessRichTextInput`).
- Import from `'../'` (functions) and `'../models'` / `'../richtext'` (types, rich text) — never from `@localess/client` or `@localess/richtext` inside a `.astro` file.

**2. Import path:** any new `.astro` component that's part of this package's *public* API needs its own subpath export in `package.json` (`"./<Name>.astro": "./dist/components/<Name>.astro"`). The `vite-plugin-static-copy` target in `vite.config.mts` already copies `src/components/*.astro` to `dist/components/`, so no build change is needed for a component — `.astro` files cannot be re-exported through `index.ts`. `.astro` files export their component as the **default** export, so consumers import with `import <Name> from '@localess/astro/<Name>.astro'`, not a named import.

**3. Test with `astro/container`, unless your component imports a `virtual:*` module:**

`AstroContainer.renderToString` requires a real `AstroComponentFactory` — Astro's renderer checks `Component.isAstroComponentFactory === true`, which only the `.astro` compiler sets. A hand-rolled mock object throws `NoMatchingRenderer`. Render the package's own `.astro` files directly (as `FallbackComponent.test.ts` and `LocalessRichText.test.ts` do); if a test needs a throwaway component, add a real `.astro` fixture file rather than a mock. `vitest.config.mts` uses `getViteConfig` from `astro/config` so `.astro` imports compile in tests.

```typescript
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import MyComponent from './MyComponent.astro';

it('renders expected output', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(MyComponent, { props: { data: { _id: '1', _schema: 'x' } } });
  expect(html).toContain('data-ll-id="1"');
});
```

**Exception:** `LocalessComponent.astro` imports `virtual:import-localess-components` / `virtual:localess-options` (and `LocalessDocument.astro` imports `LocalessComponent.astro`), which only resolve inside a real Astro build with the `localess()` integration's Vite plugins registered — `AstroContainer.create()` has no supported way to inject custom plugins (confirmed against `astro/dist/container/index.d.ts`'s `AstroContainerOptions`: only `renderers`, `astroConfig`, `resolve`, `manifest`). There are no unit tests for these two components; verify changes to them manually against `playgrounds/astro` or `playgrounds/astro-static` instead. This matches `@storyblok/astro`'s own `StoryblokComponent.astro`, which has the same gap for the same reason.

**4. Update `SKILL.md`** if the change affects the public API (per the repo's `CLAUDE.md` rule 6).

## Adding an Integration Option

1. Add the field (with JSDoc and `@default`) to `LocalessOptions` in `src/models/client.ts`.
2. Resolve its default in `localessIntegration()` (`src/lib/localess-integration.ts`) and thread it to the relevant Vite plugin or injected script.
3. **Never** pass `token` (or the whole `resolvedOptions`) into `vitePluginLocalessOptions` — `virtual:localess-options` is read by `.astro` frontmatter and the live-preview middleware. Only `clientOptions` may carry the token, and only into `vitePluginLocalessInit`, whose module is injected exclusively via the `page-ssr` stage (ADR 001; this package's token is secret-only, not yet reworked for public tokens). Anything that must reach the browser (currently `origin`, `spaceId`) goes through the injected `page` script as a JSON literal.
4. Document it in `SKILL.md`'s options table and `docs/astro.md`.

## Adding a New Entrypoint (middleware / toolbar style)

Files Astro references by `entrypoint` string — `src/live-preview/middleware.ts` (`@localess/astro/middleware`) and `src/dev-toolbar/toolbar-app.ts` (`@localess/astro/toolbarApp`) — aren't reachable through `index.ts`. A new one needs its own `build.lib.entry` in `vite.config.mts` **and** a matching `exports` subpath in `package.json` (`types`/`import`/`require`). Anything that imports `virtual:localess-options` outside a `.astro` file (as `middleware.ts` does) must also be listed in `rollupOptions.external` and carry a `@ts-expect-error` on the import, since the virtual module only resolves in the consumer's build.
