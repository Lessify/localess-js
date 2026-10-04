import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { printDiffReport } from '../../../diff-report';
import { readFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat, Translations } from '../../../models';
import { zLocaleTranslationsSchema } from '../../../models';
import { getSession } from '../../../session';
import { nestedObjectToFlat } from '../../../utils';
import { diffTranslations } from '../diff-translations';
import { explainRawUnsupported, fetchTranslations, findUnknownLocale, resolveTranslationSource, type TranslationSource } from '../source';

export type TranslationsDiffOptions = {
  path: string;
  format: TranslationFileFormat;
  draft?: boolean;
  raw?: boolean;
  all?: boolean;
  verbose?: boolean;
};

/** Direction-neutral: the same difference means "push would add it" or "pull would remove it". */
const TRANSLATION_DIFF_LABELS = { create: 'Only in file', update: 'Different', stale: 'Only in Localess' };

export const translationDiffCommand = new Command('diff')
  .argument('<locale>', 'Locale to diff')
  .description('Compare a local translations file with your Localess space — published by default, --draft or --raw (exit 1 on drift)')
  .requiredOption('-p, --path <path>', 'Path to the translations file to compare')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .option('--draft', 'Compare against the draft version of translations')
  .option('--raw', 'Compare against the values stored for this locale, without fallback filling (what push acts on)')
  .option('-a, --all', 'Also print unchanged keys')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (locale: string, options: TranslationsDiffOptions) => {
    if (!Object.values(TranslationFileFormat).includes(options.format)) {
      console.error('Invalid format provided. Possible values are :', Object.values(TranslationFileFormat));
      process.exit(1);
      return;
    }
    let source: TranslationSource;
    try {
      source = resolveTranslationSource(options);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
      return;
    }

    const session = await getSession();
    if (!session.isLoggedIn) {
      console.error('Not logged in');
      console.error('Please log in first using "localess login" command');
      process.exit(1);
      return;
    }
    const client = localessCliClient({
      origin: session.origin,
      spaceId: session.space,
      token: session.token,
      ...(options.verbose ? { debug: true } : {}),
    });

    // The published and draft endpoints silently serve the fallback locale for a locale the space
    // lacks; the stored-values endpoint answers 400 itself.
    if (source !== 'raw') {
      const localeIds = await findUnknownLocale(client, locale);
      if (localeIds) {
        console.error(`Locale '${locale}' is not in this space. Available locales: ${localeIds.join(', ')}`);
        process.exit(1);
        return;
      }
    }

    console.log('Reading translations file from:', options.path);
    const fileContent = await readFile(options.path);
    const parsed = JSON.parse(fileContent);

    let local: Translations;
    if (options.format === TranslationFileFormat.NESTED) {
      local = nestedObjectToFlat(parsed);
    } else {
      local = parsed;
    }

    const pResult = zLocaleTranslationsSchema.safeParse(local);
    if (!pResult.success) {
      console.error('Invalid translations file format:', pResult.error);
      process.exit(1);
      return;
    }

    try {
      const remote = await fetchTranslations(client, locale, source);
      const entries = diffTranslations(local, remote);
      const { drift } = printDiffReport(
        entries.map(item => ({ label: item.key, status: item.status })),
        { all: options.all, noun: 'translation', labels: TRANSLATION_DIFF_LABELS }
      );
      if (drift > 0) {
        process.exit(1);
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to diff translations:', error);
      }
      explainRawUnsupported(error, source);
      process.exit(1);
    }
  });
