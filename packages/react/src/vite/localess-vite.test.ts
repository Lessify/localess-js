import { describe, expect, it } from 'vitest';

import { localessVite } from './localess-vite';

const baseOptions = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'secret-token' };

describe('localessVite', () => {
  it('returns the components plugin and the init plugin, in that order', () => {
    const plugins = localessVite(baseOptions);

    expect(plugins).toHaveLength(2);
    expect(plugins[0].name).toBe('vite-plugin-localess-components');
    expect(plugins[1].name).toBe('vite-plugin-localess-init');
  });

  it('defaults componentsDir to "src"', async () => {
    const plugins = localessVite(baseOptions);
    const ctx = { resolve: async () => null };
    const loaded = await (plugins[0].load as any).call(ctx, '\0virtual:localess-components');

    expect(loaded.code).toContain(`import.meta.glob('/src/**/*.{tsx,jsx}'`);
  });

  it('passes a custom componentsDir through to the components plugin', async () => {
    const plugins = localessVite({ ...baseOptions, componentsDir: 'app/localess' });
    const ctx = { resolve: async () => null };
    const loaded = await (plugins[0].load as any).call(ctx, '\0virtual:localess-components');

    expect(loaded.code).toContain(`import.meta.glob('/app/localess/**/*.{tsx,jsx}'`);
  });

  it('throws when origin is missing', () => {
    expect(() => localessVite({ ...baseOptions, origin: '' })).toThrow(
      '[@localess/react/vite] localessVite() requires "origin", "spaceId", and "token".'
    );
  });

  it('throws when spaceId is missing', () => {
    const { spaceId: _spaceId, ...rest } = baseOptions as any;
    expect(() => localessVite(rest)).toThrow('requires "origin", "spaceId", and "token"');
  });

  it('throws when token is missing', () => {
    const { token: _token, ...rest } = baseOptions as any;
    expect(() => localessVite(rest)).toThrow('requires "origin", "spaceId", and "token"');
  });
});
