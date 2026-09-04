import { describe, expect, it, vi } from 'vitest';

import type { TranslationUpdateResponse } from '../../models';
import { TranslationUpdateType } from '../../models';
import { diffTranslations, printTranslationDiffMismatches, reconcileTranslationDiff, type TranslationDiffEntry } from './diff-translations';

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

describe('reconcileTranslationDiff', () => {
  const response = (ids?: string[]): TranslationUpdateResponse => ({ message: 'ok', ...(ids ? { ids } : {}) });

  it('reports no mismatches when the server result matches the prediction (add-missing)', () => {
    const diff: TranslationDiffEntry[] = [
      { key: 'nav.fresh', status: 'create' },
      { key: 'nav.home', status: 'unchanged' },
    ];
    expect(reconcileTranslationDiff(diff, TranslationUpdateType.ADD_MISSING, response(['nav.fresh']))).toEqual([]);
  });

  it('flags a predicted key the server did not report (add-missing)', () => {
    const diff: TranslationDiffEntry[] = [{ key: 'nav.fresh', status: 'create' }];
    expect(reconcileTranslationDiff(diff, TranslationUpdateType.ADD_MISSING, response([]))).toEqual([
      { key: 'nav.fresh', predicted: 'create', actual: 'unaffected' },
    ]);
  });

  it('flags an unpredicted key the server did report', () => {
    const diff: TranslationDiffEntry[] = [{ key: 'nav.footer', status: 'unchanged' }];
    expect(reconcileTranslationDiff(diff, TranslationUpdateType.UPDATE_EXISTING, response(['nav.footer']))).toEqual([
      { key: 'nav.footer', predicted: 'unchanged', actual: 'affected' },
    ]);
  });

  it('matches update-existing against "update" status and delete-missing against "stale" status', () => {
    const diff: TranslationDiffEntry[] = [
      { key: 'nav.about', status: 'update' },
      { key: 'nav.legacy', status: 'stale' },
    ];
    expect(reconcileTranslationDiff(diff, TranslationUpdateType.UPDATE_EXISTING, response(['nav.about']))).toEqual([]);
    expect(reconcileTranslationDiff(diff, TranslationUpdateType.DELETE_MISSING, response(['nav.legacy']))).toEqual([]);
  });

  it('skips reconciliation entirely when the response has no ids', () => {
    const diff: TranslationDiffEntry[] = [{ key: 'nav.fresh', status: 'create' }];
    expect(reconcileTranslationDiff(diff, TranslationUpdateType.ADD_MISSING, response())).toEqual([]);
  });
});

describe('printTranslationDiffMismatches', () => {
  it('prints nothing when there are no mismatches', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    printTranslationDiffMismatches([]);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('prints a warning line per mismatch', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    printTranslationDiffMismatches([{ key: 'nav.fresh', predicted: 'create', actual: 'unaffected' }]);
    const logs = log.mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Prediction mismatch'))).toBe(true);
    expect(logs.some(line => line.includes('nav.fresh: predicted "create", server reported "unaffected"'))).toBe(true);
    log.mockRestore();
  });
});
