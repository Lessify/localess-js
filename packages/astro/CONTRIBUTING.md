# Contributing to @localess/astro

Astro integration layer. Depends on `@localess/client`. Components never fetch data — they accept server-fetched data as props, same rule as `@localess/react`.

## Adding a New Component

**1. Create `src/components/<Name>.astro`:**

```astro
---
import { localessEditable } from '@localess/client';

export interface Props {
  data: { _id: string; _schema: string } & Record<string, unknown>;
  links?: unknown;
  references?: unknown;
}

const { data, links, references, ...restProps } = Astro.props;
---

<div {...localessEditable(data)} {...restProps}>
  {/* render data fields here */}
</div>
```

Rules:
- Always spread `{...localessEditable(data)}` on the root element — it adds `data-ll-id` and `data-ll-schema` for Visual Editor targeting (harmless no-op when sync is disabled).
- Always spread `{...restProps}` on the root element so `class`, etc. pass through.
- Accept `links` and `references` as optional props and forward them to any nested `LocalessComponent` instances.
- Never call `getLocalessClient()` or fetch data inside a component.

**2. Import path:** any new `.astro` component that's part of this package's *public* API needs its own subpath export in `package.json` (`"./<Name>.astro": "./dist/components/<Name>.astro"`) and a matching `vite-plugin-static-copy` target in `vite.config.ts` — `.astro` files cannot be re-exported through `index.ts`. `.astro` files export their component as the **default** export, so consumers import with `import <Name> from '@localess/astro/<Name>.astro'`, not a named import.

**3. Test with `astro/container`, unless your component imports a `virtual:*` module:**

`AstroContainer.renderToString` requires a real `AstroComponentFactory` — Astro's renderer checks `Component.isAstroComponentFactory === true`, which only the `.astro` compiler sets. A hand-rolled mock object throws `NoMatchingRenderer`. Use a real fixture `.astro` file under `src/components/__fixtures__/` when a test needs one.

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

**Exception:** `LocalessComponent.astro` and `LocalessDocument.astro` import `virtual:import-localess-components` / `virtual:localess-options`, which only resolve inside a real Astro build with the `localess()` integration's Vite plugins registered — `AstroContainer.create()` has no supported way to inject custom plugins (confirmed against `astro/dist/container/index.d.ts`'s `AstroContainerOptions`: only `renderers`, `astroConfig`, `resolve`, `manifest`). There are no unit tests for these two components; verify changes to them manually against `playgrounds/astro` or `playgrounds/astro-static` instead. This matches `@storyblok/astro`'s own `StoryblokComponent.astro`, which has the same gap for the same reason.

**4. Update `SKILL.md`** if the change affects the public API (per the repo's `CLAUDE.md` rule 6).
