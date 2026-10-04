import { Command } from 'commander';

import { type LocalessCliClient, localessCliClient } from '../../../client';
import { writeFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat } from '../../../models';
import { getSession } from '../../../session';
import { dotToNestedObject, sortObjectKeys } from '../../../utils';

export type TranslationsPullOptions = {
  path: string;
  format: TranslationFileFormat;
  draft?: boolean;
  raw?: boolean;
  verbose?: boolean;
};

/**
 * The space's locale ids, or `undefined` when they can't be read — reading the space needs the
 * `DEV_TOOLS` permission, which a plain pull does not, so a token without it skips the check.
 */
async function spaceLocaleIds(client: LocalessCliClient): Promise<string[] | undefined> {
  try {
    const space = await client.getSpace({ silent: true });
    return space.locales?.map(it => it.id);
  } catch {
    return undefined;
  }
}

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
    if (options.raw && options.draft) {
      console.error('--raw and --draft cannot be combined: --raw already reads the current, unpublished values.');
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

    if (!options.raw) {
      // The published endpoint silently serves the fallback locale for a locale the space lacks.
      const localeIds = await spaceLocaleIds(client);
      if (localeIds && !localeIds.includes(locale)) {
        console.error(`Locale '${locale}' is not in this space. Available locales: ${localeIds.join(', ')}`);
        process.exit(1);
      }
    }

    console.log('Pulling translations from Localess for locale:', locale);
    try {
      const translations = options.raw
        ? await client.getTranslationValues(locale)
        : await client.getTranslations(locale, { version: options.draft ? 'draft' : undefined });

      console.log('Saving translations in file:', options.path);
      if (options.format === TranslationFileFormat.FLAT) {
        await writeFile(options.path, JSON.stringify(sortObjectKeys(translations), null, 2));
      } else if (options.format === TranslationFileFormat.NESTED) {
        const nestedTranslations = sortObjectKeys(dotToNestedObject(translations));
        await writeFile(options.path, JSON.stringify(nestedTranslations, null, 2));
      }
      console.log('Successfully saved translations from Localess');
      if (!options.raw) {
        console.log('Keys without a value in this locale were filled from the fallback locale. To edit and push back, pull with --raw.');
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to pull translations from Localess:', error);
      } else if (options.raw && error.status === 404) {
        console.error('--raw needs a Localess platform newer than 4.0.0, which serves stored translation values.');
      }
      process.exit(1);
    }
  });
