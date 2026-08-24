import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { writeFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat } from '../../../models';
import { getSession } from '../../../session';
import { dotToNestedObject, sortObjectKeys } from '../../../utils';

export type TranslationsPullOptions = {
  path: string;
  format: TranslationFileFormat;
  draft?: boolean;
  verbose?: boolean;
};

export const translationsPullCommand = new Command('pull')
  .argument('<locale>', 'Locale to pull')
  .description('Pull locale translations from Localess')
  .requiredOption('-p, --path <path>', 'Path where the translations file will be saved')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .option('--draft', 'Pull the draft version of translations')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (locale: string, options: TranslationsPullOptions) => {
    console.log('Pulling translations with arguments:', locale);
    console.log('Pulling translations with options:', options);
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

    console.log('Pulling translations from Localess for locale:', locale);
    try {
      const translations = await client.getTranslations(locale, { version: options.draft ? 'draft' : undefined });

      console.log('Saving translations in file:', options.path);
      if (options.format === TranslationFileFormat.FLAT) {
        await writeFile(options.path, JSON.stringify(sortObjectKeys(translations), null, 2));
      } else if (options.format === TranslationFileFormat.NESTED) {
        const nestedTranslations = sortObjectKeys(dotToNestedObject(translations));
        await writeFile(options.path, JSON.stringify(nestedTranslations, null, 2));
      }
      console.log('Successfully saved translations from Localess');
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to pull translations from Localess:', error);
      }
      process.exit(1);
    }
  });
