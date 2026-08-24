import { describe, expect, it } from 'vitest';

import { localess } from './localess';

describe('localess (svelte vite plugin)', () => {
  it('returns a single plugin for component auto-registration', () => {
    const plugins = localess({ componentsDir: 'src/lib/components' });
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('vite-plugin-localess-svelte-components');
  });

  it('defaults componentsDir to "src"', () => {
    const plugins = localess({});
    expect(plugins).toHaveLength(1);
  });
});
