import { describe, expect, it } from 'vitest';

import { buildDevtoolsPayload, findDevtoolsCollisions, renderDevtoolsPage } from './devtools';

const base = {
  origin: 'https://cms.example.com',
  spaceId: 'space-1',
  componentNaming: 'exact' as const,
  componentsDir: '/app/components/localess',
  files: [] as string[],
  overrides: {} as Record<string, string>,
};

describe('buildDevtoolsPayload', () => {
  it('reports token presence without ever carrying the values', () => {
    const payload = buildDevtoolsPayload({ ...base, token: 'public-secret-value', serverToken: 'server-secret-value' });

    expect(payload.hasPublicToken).toBe(true);
    expect(payload.hasServerToken).toBe(true);
    expect(JSON.stringify(payload)).not.toContain('public-secret-value');
    expect(JSON.stringify(payload)).not.toContain('server-secret-value');
  });

  it('reports a missing token as absent', () => {
    const payload = buildDevtoolsPayload({ ...base, serverToken: 's' });

    expect(payload.hasPublicToken).toBe(false);
    expect(payload.hasServerToken).toBe(true);
  });

  it('derives the registry key from the file name', () => {
    const payload = buildDevtoolsPayload({ ...base, token: 't', files: ['/app/components/localess/Page.vue'] });

    expect(payload.components).toEqual([{ file: '/app/components/localess/Page.vue', key: 'Page', resolvesAs: 'Page' }]);
  });

  it('shows what a schema must resolve to under a non-exact strategy', () => {
    const payload = buildDevtoolsPayload({
      ...base,
      token: 't',
      componentNaming: 'camelCase',
      files: ['/app/components/localess/page.vue'],
    });

    expect(payload.components[0].resolvesAs).toBe('page');
  });

  it('marks entries that came from the components override map', () => {
    const payload = buildDevtoolsPayload({ ...base, token: 't', overrides: { Hero: 'blocks/Hero.vue' } });

    expect(payload.components).toEqual([{ file: 'blocks/Hero.vue', key: 'Hero', resolvesAs: 'Hero', override: true }]);
  });

  it('handles Windows paths', () => {
    const payload = buildDevtoolsPayload({ ...base, token: 't', files: ['C:\\app\\components\\localess\\Page.vue'] });

    expect(payload.components[0].key).toBe('Page');
  });
});

describe('findDevtoolsCollisions', () => {
  it('finds keys that resolve to the same value', () => {
    const collisions = findDevtoolsCollisions([
      { file: 'a', key: 'HeroBanner', resolvesAs: 'heroBanner' },
      { file: 'b', key: 'hero-banner', resolvesAs: 'heroBanner' },
      { file: 'c', key: 'Page', resolvesAs: 'page' },
    ]);

    expect(collisions).toEqual([{ resolvesAs: 'heroBanner', keys: ['HeroBanner', 'hero-banner'] }]);
  });

  it('finds none when every key is distinct', () => {
    expect(findDevtoolsCollisions([{ file: 'a', key: 'Page', resolvesAs: 'Page' }])).toEqual([]);
  });
});

describe('renderDevtoolsPage', () => {
  const payload = buildDevtoolsPayload({
    ...base,
    token: 'public-secret-value',
    serverToken: 'server-secret-value',
    componentNaming: 'camelCase',
    files: ['/app/components/localess/page.vue', '/app/components/localess/button.vue'],
  });

  it('never renders a token value', () => {
    const html = renderDevtoolsPage(payload);

    expect(html).not.toContain('public-secret-value');
    expect(html).not.toContain('server-secret-value');
    expect(html).toContain('configured');
  });

  it('shows the origin, space, and naming strategy', () => {
    const html = renderDevtoolsPage(payload);

    expect(html).toContain('https://cms.example.com');
    expect(html).toContain('space-1');
    expect(html).toContain('camelCase');
  });

  it('lists each component and the key it resolves as', () => {
    const html = renderDevtoolsPage(payload);

    expect(html).toContain('<code>page</code>');
    expect(html).toContain('<code>button</code>');
  });

  it('says so when the directory yielded nothing', () => {
    const html = renderDevtoolsPage(buildDevtoolsPayload({ ...base, token: 't' }));

    expect(html).toContain('No components found');
  });

  it('warns about a collision, naming both keys', () => {
    const html = renderDevtoolsPage(
      buildDevtoolsPayload({
        ...base,
        token: 't',
        componentNaming: 'camelCase',
        files: ['/c/HeroBanner.vue', '/c/hero-banner.vue'],
      })
    );

    expect(html).toContain('Naming collision');
    expect(html).toContain('HeroBanner, hero-banner');
  });

  it('does not warn when there is no collision', () => {
    expect(renderDevtoolsPage(payload)).not.toContain('Naming collision');
  });

  it('escapes values rather than injecting them as markup', () => {
    const html = renderDevtoolsPage(buildDevtoolsPayload({ ...base, token: 't', spaceId: '<img src=x onerror=alert(1)>' }));

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('links to the space in Studio', () => {
    expect(renderDevtoolsPage(payload)).toContain('https://cms.example.com/spaces/space-1');
  });
});
