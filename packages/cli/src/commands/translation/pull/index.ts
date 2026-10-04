import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { writeFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat } from '../../../models';
import { getSession } from '../../../session';
import { sortObjectKeys, toNestedTranslations } from '../../../utils';
import { explainRawUnsupported, fetchTranslations, findUnknownLocale, resolveTranslationSource, type TranslationSource } from '../source';

export type TranslationsPullOptions = {
  path: string;
  format: TranslationFileFormat;
  draft?: boolean;
  raw?: boolean;
  verbose?: boolean;
};

export const translationPullCommand = new Command('pull')
  .argument('<locale>', 'Locale to pull')
  .description('Pull locale translations from Localess')
  .requiredOption('-p, --path <path>', 'Path where the translations file will be saved')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .option('--draft', 'Pull the draft version of translations')
  .option(
    '--raw',
    'Pull only the values stored for this locale, without filling gaps from the fallback locale. Use this for files you edit and push back'
  )
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (locale: string, options: TranslationsPullOptions) => {
    console.log('Pulling translations with arguments:', locale);
    console.log('Pulling translations with options:', options);
    if (!Object.values(TranslationFileFormat).includes(options.format)) {
      console.error('Invalid format provided. Possible values are :', Object.values(TranslationFileFormat));
      process.exit(1);
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
      }
    }

    console.log('Pulling translations from Localess for locale:', locale);
    try {
      const translations = await fetchTranslations(client, locale, source);

      console.log('Saving translations in file:', options.path);
      if (options.format === TranslationFileFormat.FLAT) {
        await writeFile(options.path, JSON.stringify(sortObjectKeys(translations), null, 2));
      } else if (options.format === TranslationFileFormat.NESTED) {
        const { nested, dropped } = toNestedTranslations(translations);
        if (dropped.length > 0) {
          console.warn(
            `${dropped.length} key(s) are also parents of other keys and can't hold a value in the nested format; their values were left out: ${dropped.join(', ')}. Use --format flat to keep them.`
          );
        }
        await writeFile(options.path, JSON.stringify(sortObjectKeys(nested), null, 2));
      }
      console.log('Successfully saved translations from Localess');
      if (source !== 'raw') {
        console.log('Keys without a value in this locale were filled from the fallback locale. To edit and push back, pull with --raw.');
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to pull translations from Localess:', error);
      }
      explainRawUnsupported(error, source);
      process.exit(1);
    }
  });
