import type { Translations } from '../../models';

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
