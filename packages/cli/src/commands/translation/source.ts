import type { LocalessCliClient } from '../../client';
import { LocalessApiError, type Translations } from '../../models';

/** Where translation values are read from: published or draft files (fallback-filled), or stored values (unfilled). */
export type TranslationSource = 'published' | 'draft' | 'raw';

/**
 * Maps the `--draft` / `--raw` flags to a source. Published is the default, matching the runtime SDK and the API.
 * @throws when both flags are set — stored values already are the current, unpublished state.
 */
export function resolveTranslationSource(flags: { draft?: boolean; raw?: boolean }): TranslationSource {
  if (flags.raw && flags.draft) {
    throw new Error('--raw and --draft cannot be combined: --raw already reads the current, unpublished values.');
  }
  if (flags.raw) return 'raw';
  return flags.draft ? 'draft' : 'published';
}

/**
 * The space's locale ids when `locale` is not one of them, otherwise `undefined`. Reading the space needs
 * `DEV_TOOLS`, which reading translations does not, so a token without it skips the check.
 */
export async function findUnknownLocale(client: LocalessCliClient, locale: string): Promise<string[] | undefined> {
  try {
    const space = await client.getSpace({ silent: true });
    const ids = space.locales?.map(it => it.id) ?? [];
    // No locale list to check against: skip, rather than refuse every locale.
    if (ids.length === 0) return undefined;
    return ids.includes(locale) ? undefined : ids;
  } catch {
    return undefined;
  }
}

/** Reads one locale from the given source. */
export function fetchTranslations(client: LocalessCliClient, locale: string, source: TranslationSource): Promise<Translations> {
  if (source === 'raw') return client.getTranslationValues(locale);
  return client.getTranslations(locale, { version: source === 'draft' ? 'draft' : undefined });
}

/** Explains a 404 on `--raw`: platforms up to 4.0.0 have no stored-values endpoint. */
export function explainRawUnsupported(error: unknown, source: TranslationSource): void {
  if (source === 'raw' && error instanceof LocalessApiError && error.status === 404) {
    console.error('--raw needs a Localess platform newer than 4.0.0, which serves stored translation values.');
  }
}
