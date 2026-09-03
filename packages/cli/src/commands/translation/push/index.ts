import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { readFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat, Translations, TranslationUpdateType } from '../../../models';
import { zLocaleTranslationsSchema, zTranslationUpdateTypeSchema } from '../../../models/translation.zod';
import { getSession } from '../../../session';
import { nestedObjectToFlat } from '../../../utils';

export type TranslationsPushOptions = {
  path: string;
  format: TranslationFileFormat;
  type: TranslationUpdateType;
  dryRun?: boolean;
  verbose?: boolean;
};

export const translationPushCommand = new Command('push')
  .argument('<locale>', 'Locale to push')
  .description('Push locale translations to Localess')
  .requiredOption('-p, --path <path>', 'Path to the translations file to push')
  .option('-f, --format <format>', `File format. Possible values are : ${Object.values(TranslationFileFormat)}`, TranslationFileFormat.FLAT)
  .option(
    '-t, --type <type>',
    `Push type. Possible values are : ${Object.values(TranslationUpdateType)}`,
    TranslationUpdateType.ADD_MISSING
  )
  .option('--dry-run', 'Preview changes without applying them to Localess')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (locale: string, options: TranslationsPushOptions) => {
    console.log('Pushing translations with arguments:', locale);
    console.log('Pushing translations with options:', options);
    if (!zTranslationUpdateTypeSchema.safeParse(options.type).success) {
      console.error('Invalid type provided. Possible values are :', Object.values(TranslationUpdateType));
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

    if (options.dryRun) {
      console.warn('Dry run mode enabled: No changes will be made.');
    }

    console.log('Reading translations file from:', options.path);
    const fileContent = await readFile(options.path);
    const parsed = JSON.parse(fileContent);

    let translationValues: Translations;
    if (options.format === TranslationFileFormat.NESTED) {
      translationValues = nestedObjectToFlat(parsed);
    } else {
      translationValues = parsed;
    }

    const pResult = zLocaleTranslationsSchema.safeParse(translationValues);
    if (!pResult.success) {
      console.error('Invalid translations file format:', pResult.error);
      process.exit(1);
    }
    console.log('Pushing translations to Localess with locale:', locale, 'and type:', options.type);
    try {
      const response = await client.updateTranslations(locale, options.type, translationValues, options.dryRun);
      if (response.dryRun) {
        console.log('Dry run results:');
      }
      console.log('Successfully pushed translations to Localess');
      console.log('Summary:', response.message);
      if (response.ids) {
        console.log('Updated translation IDs:', response.ids);
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to push translations to Localess:', error);
      }
      process.exit(1);
    }
  });
