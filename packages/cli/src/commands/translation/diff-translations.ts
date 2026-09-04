import chalk from 'chalk';

import type { Translations, TranslationUpdateResponse } from '../../models';
import { TranslationUpdateType } from '../../models';

export type TranslationDiffStatus = 'create' | 'update' | 'unchanged' | 'stale';

export interface TranslationDiffEntry {
  key: string;
  status: TranslationDiffStatus;
}

/**
 * Classify each translation key: create (local only), update (both, different value),
 * unchanged (both, equal), stale (remote only). Local keys keep their order; stale keys follow.
 */
export function diffTranslations(local: Translations, remote: Translations): TranslationDiffEntry[] {
  const entries: TranslationDiffEntry[] = Object.keys(local).map(key => {
    if (!(key in remote)) return { key, status: 'create' };
    return { key, status: local[key] === remote[key] ? 'unchanged' : 'update' };
  });
  for (const key of Object.keys(remote)) {
    if (!(key in local)) entries.push({ key, status: 'stale' });
  }
  return entries;
}

export type TranslationActualStatus = 'affected' | 'unaffected';

export interface TranslationDiffMismatch {
  key: string;
  predicted: TranslationDiffStatus;
  actual: TranslationActualStatus;
}

const EXPECTED_STATUS_BY_TYPE: Record<TranslationUpdateType, TranslationDiffStatus> = {
  [TranslationUpdateType.ADD_MISSING]: 'create',
  [TranslationUpdateType.UPDATE_EXISTING]: 'update',
  [TranslationUpdateType.DELETE_MISSING]: 'stale',
};

/**
 * Compares the pre-push diff against the server's push response, flagging any key whose
 * predicted status doesn't match what the server actually did (e.g. a concurrent change
 * between preview and push). Each push type only ever performs one kind of operation, so
 * a key is "expected" to appear in `response.ids` only if its status matches that type's
 * operation. Skipped entirely when the response carries no `ids` to compare against.
 */
export function reconcileTranslationDiff(
  diff: TranslationDiffEntry[],
  type: TranslationUpdateType,
  response: TranslationUpdateResponse
): TranslationDiffMismatch[] {
  if (!response.ids) return [];
  const actualIds = new Set(response.ids);
  const expectedStatus = EXPECTED_STATUS_BY_TYPE[type];
  const mismatches: TranslationDiffMismatch[] = [];
  for (const entry of diff) {
    const expectedAffected = entry.status === expectedStatus;
    const actualAffected = actualIds.has(entry.key);
    if (expectedAffected !== actualAffected) {
      mismatches.push({ key: entry.key, predicted: entry.status, actual: actualAffected ? 'affected' : 'unaffected' });
    }
  }
  return mismatches;
}

/** Prints a warning block for each prediction mismatch; prints nothing when the list is empty. */
export function printTranslationDiffMismatches(mismatches: TranslationDiffMismatch[]): void {
  if (mismatches.length === 0) return;
  console.log(chalk.yellow.bold('\n⚠ Prediction mismatch (local preview vs server result):'));
  for (const { key, predicted, actual } of mismatches) {
    console.log(chalk.yellow(`  ${key}: predicted "${predicted}", server reported "${actual}"`));
  }
}
