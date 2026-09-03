import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { printDiffReport } from '../../../diff-report';
import { readFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat, Translations, TranslationUpdateType } from '../../../models';
import { zLocaleTranslationsSchema, zTranslationUpdateTypeSchema } from '../../../models';
import { getSession } from '../../../session';
import { nestedObjectToFlat } from '../../../utils';
import { diffTranslations } from '../diff-translations';

export type TranslationsPushOptions = {
  path: string;
  format: TranslationFileFormat;
  type: TranslationUpdateType;
  dryRun?: boolean;
  all?: boolean;
  yes?: boolean;
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
  .option('-a, --all', 'Also print unchanged keys in the preview')
  .option('-y, --yes', 'Skip the confirmation prompt for update-existing/delete-missing')
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
      const remote = await client.getTranslations(locale, { version: 'draft' });
      const entries = diffTranslations(translationValues, remote);
      printDiffReport(
        entries.map(item => ({ label: item.key, status: item.status })),
        { all: options.all, noun: 'translation' }
      );

      const created = entries.filter(item => item.status === 'create').length;
      const updated = entries.filter(item => item.status === 'update').length;
      const stale = entries.filter(item => item.status === 'stale').length;

      if (options.type === TranslationUpdateType.ADD_MISSING) {
        console.log(
          created > 0
            ? chalk.green(`\n--type add-missing: only the ${created} new key(s) above will be pushed; existing keys are left untouched.`)
            : chalk.dim('\nNo new keys — nothing to add.')
        );
      } else if (options.type === TranslationUpdateType.UPDATE_EXISTING) {
        if (updated === 0) {
          console.log(chalk.dim('\nNo existing keys differ — nothing to update.'));
        } else {
          console.log(chalk.yellow(`\n--type update-existing will overwrite ${updated} key(s) in Localess with your local values.`));
          if (!options.yes && !options.dryRun) {
            const proceed = await confirm({
              message: `Any edits made to these keys in Localess since your last pull will be lost. Continue?`,
              default: false,
            });
            if (!proceed) {
              console.log('Aborted.');
              process.exit(1);
              return;
            }
          }
        }
      } else if (options.type === TranslationUpdateType.DELETE_MISSING) {
        if (stale === 0) {
          console.log(chalk.dim('\nNo keys are absent locally — nothing to delete.'));
        } else {
          console.log(chalk.red(`\n--type delete-missing will delete ${stale} key(s) from Localess absent from your local file.`));
          if (!options.yes && !options.dryRun) {
            const proceed = await confirm({
              message: `Delete
              ${stale} key(s) from Localess?`,
              default: false,
            });
            if (!proceed) {
              console.log('Aborted.');
              process.exit(1);
              return;
            }
          }
        }
      }

      const response = await client.updateTranslations(locale, options.type, translationValues, options.dryRun);
      if (response.dryRun) {
        console.log('\nDry run results:');
      }
      console.log('\nSuccessfully pushed translations to Localess');
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
