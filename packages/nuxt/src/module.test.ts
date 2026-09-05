import { normalizeComponentKey } from '@localess/vue';
import { describe, expect, it } from 'vitest';

import { generateComponentsTemplate } from './module';

describe('generateComponentsTemplate', () => {
  it('registers a component under its filename verbatim', () => {
    const code = generateComponentsTemplate(['/app/components/localess/Page.vue'], []);

    expect(code).toContain('import __component_0__ from "/app/components/localess/Page.vue";');
    expect(code).toContain('__localessRegistry__["Page"] = __component_0__;');
    expect(code).not.toContain('"page"');
  });

  it('emits the verbatim key that `_schema` actually matches', () => {
    const registry = evaluate(generateComponentsTemplate(['/c/Page.vue', '/c/Button.vue'], []));

    expect(registry['Page']).toBe('/c/Page.vue');
    expect(registry['Button']).toBe('/c/Button.vue');
  });

  it('does not let a later component clobber an existing key', () => {
    const registry = evaluate(generateComponentsTemplate(['/c/Page.vue', '/c/Page.vue'], []));

    expect(registry['Page']).toBe('/c/Page.vue');
  });

  it('lets explicit overrides win over discovered components', () => {
    const registry = evaluate(generateComponentsTemplate(['/c/Page.vue'], [{ key: 'Page', importPath: '/c/Custom.vue' }]));

    expect(registry['Page']).toBe('/c/Custom.vue');
  });

  it('imports a named export when the override specifies one', () => {
    const code = generateComponentsTemplate([], [{ key: 'Page', importPath: '/c/Custom.vue', exportName: 'PageBlock' }]);

    expect(code).toContain('import { PageBlock as __override_0__ } from "/c/Custom.vue";');
  });

  it('normalises Windows separators into module specifiers', () => {
    const code = generateComponentsTemplate(['C:\\app\\components\\Page.vue'], []);

    expect(code).not.toContain('\\\\');
    expect(code).toContain('C:/app/components/Page.vue');
  });

  it('produces a valid empty registry when no components exist', () => {
    expect(evaluate(generateComponentsTemplate([], []))).toEqual({});
  });
});

/**
 * Executes the generated template with each `import` rewritten to a string
 * literal of its specifier, so assertions read the registry the template builds
 * rather than its source text.
 */
function evaluate(code: string): Record<string, unknown> {
  const body = code
    .replace(/import \{ normalizeComponentKey \} from '@localess\/vue';/, '')
    .replace(/import \{ (\w+) as (__\w+__) \} from ("[^"]+");/g, 'const $2 = $3;')
    .replace(/import (__\w+__) from ("[^"]+");/g, 'const $1 = $2;')
    .replace(/export \{ localessComponents \};?/, 'return localessComponents;');
  return new Function('normalizeComponentKey', body)(normalizeComponentKey) as Record<string, unknown>;
}

describe('componentNaming in the generated template', () => {
  const files = ['/c/HeroBanner.vue'];

  it('emits a plain object with no Proxy under the default exact strategy', () => {
    const code = generateComponentsTemplate(files, []);

    expect(code).not.toContain('Proxy');
    expect(code).not.toContain('normalizeComponentKey');
  });

  it('matches only the identical spelling under exact', () => {
    const registry = evaluate(generateComponentsTemplate(files, [], 'exact'));

    expect(registry['HeroBanner']).toBe('/c/HeroBanner.vue');
    expect(registry['hero-banner']).toBeUndefined();
  });

  it('resolves any spelling under camelCase', () => {
    const registry = evaluate(generateComponentsTemplate(files, [], 'camelCase'));

    for (const schema of ['HeroBanner', 'heroBanner', 'hero-banner', 'hero_banner']) {
      expect(registry[schema]).toBe('/c/HeroBanner.vue');
    }
  });

  it('answers Object.hasOwn, which is how the Vue plugin probes the registry', () => {
    const registry = evaluate(generateComponentsTemplate(files, [], 'kebab-case'));

    expect(Object.hasOwn(registry, 'hero_banner')).toBe(true);
    expect(Object.hasOwn(registry, 'Missing')).toBe(false);
  });
});
