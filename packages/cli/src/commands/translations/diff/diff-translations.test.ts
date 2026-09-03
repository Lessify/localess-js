import { describe, expect, it } from 'vitest';

import { diffTranslations } from './diff-translations';

describe('diffTranslations', () => {
  const remote = {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.stale': 'Stale',
  };
  const local = {
    'nav.home': 'Home',
    'nav.about': 'About Us',
    'nav.fresh': 'Fresh',
  };

  it('classifies create/update/unchanged/stale', () => {
    const result = Object.fromEntries(diffTranslations(local, remote).map(e => [e.key, e.status]));
    expect(result).toEqual({
      'nav.home': 'unchanged',
      'nav.about': 'update',
      'nav.fresh': 'create',
      'nav.stale': 'stale',
    });
  });

  it('orders entries: local order first, then stale', () => {
    expect(diffTranslations(local, remote).map(e => e.key)).toEqual(['nav.home', 'nav.about', 'nav.fresh', 'nav.stale']);
  });

  it('reports everything unchanged when local and remote are identical', () => {
    expect(diffTranslations(remote, remote).map(e => e.status)).toEqual(['unchanged', 'unchanged', 'unchanged']);
  });

  it('reports empty diff for two empty objects', () => {
    expect(diffTranslations({}, {})).toEqual([]);
  });
});
