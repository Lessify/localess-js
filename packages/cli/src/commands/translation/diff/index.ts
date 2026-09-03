import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { printDiffReport } from '../../../diff-report';
import { readFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat, Translations } from '../../../models';
import { zLocaleTranslationsSchema } from '../../../models';
import { getSession } from '../../../session';
import { nestedObjectToFlat } from '../../../utils';
import { diffTranslations } from './diff-translations';

export type TranslationsDiffOptions = {
  path: string;
  format: TranslationFileFormat;
  draft?: boolean;
  all?: boolean;
  verbose?: boolean;
};

export const translationDiffCommand = new Command('diff')
  .argument('<locale>', 'Locale to diff')
  .description('Compare a local translations file with your Localess space (exit 1 on drift)')
  .requiredOption('-p, --path <path>', 'Path to the translations file to compare')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .option('--draft', 'Compare against the draft version of translations')
  .option('-a, --all', 'Also print unchanged keys')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (locale: string, options: TranslationsDiffOptions) => {
    if (!Object.values(TranslationFileFormat).includes(options.format)) {
      console.error('Invalid format provided. Possible values are :', Object.values(TranslationFileFormat));
      process.exit(1);
    }

    const session = await getSession();
    if (!session.isLoggedIn) {
      console.error('Not logged in');
      console.error('Please log in first using "localess login" command');
      process.exit(1);
    }
    const client = localessCliClient({
      origin: session.origin,
      spaceId: session.space,
      token: session.token,
      ...(options.verbose ? { debug: true } : {}),
    });

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
    }

    try {
      const remote = await client.getTranslations(locale, { version: options.draft ? 'draft' : undefined });
      const entries = diffTranslations(local, remote);
      const { drift } = printDiffReport(
        entries.map(item => ({ label: item.key, status: item.status })),
        { all: options.all, noun: 'translation' }
      );
      if (drift > 0) {
        process.exit(1);
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to diff translations:', error);
      }
      process.exit(1);
    }
  });
