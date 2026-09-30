import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { readFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat, Translations, TranslationUpdateType } from '../../../models';
import { zLocaleTranslationsSchema, zTranslationUpdateTypeSchema } from '../../../models';
import { getSession } from '../../../session';
import { nestedObjectToFlat } from '../../../utils';

export type TranslationsPushOptions = {
  path: string;
  format: TranslationFileFormat;
  type: TranslationUpdateType;
  dryRun?: boolean;
  yes?: boolean;
  verbose?: boolean;
};

const PUSH_TYPE_LABELS: Record<TranslationUpdateType, { verb: string; past: string; symbol: string; color: (text: string) => string }> = {
  [TranslationUpdateType.ADD_MISSING]: { verb: 'add', past: 'Added', symbol: '+', color: chalk.green },
  [TranslationUpdateType.UPDATE_EXISTING]: { verb: 'update', past: 'Updated', symbol: '~', color: chalk.yellow },
  [TranslationUpdateType.DELETE_MISSING]: { verb: 'delete', past: 'Deleted', symbol: '-', color: chalk.red },
};

function pluralize(count: number): string {
  return `${count} translation${count === 1 ? '' : 's'}`;
}

function printKeys(ids: string[], type: TranslationUpdateType): void {
  const { symbol, color } = PUSH_TYPE_LABELS[type];
  for (const id of ids) {
    console.log(color(`  ${symbol} ${id}`));
  }
}

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
  .option('-y, --yes', 'Skip the confirmation prompt for update-existing/delete-missing')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (locale: string, options: TranslationsPushOptions) => {
    if (options.verbose) {
      console.log('Pushing translations with arguments:', locale);
      console.log('Pushing translations with options:', options);
    }
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

    const { verb, past } = PUSH_TYPE_LABELS[options.type];
    try {
      const needsConfirmation = options.type !== TranslationUpdateType.ADD_MISSING && !options.yes && !options.dryRun;
      if (needsConfirmation) {
        const { ids } = await client.updateTranslations(locale, options.type, translationValues, true);
        if (!ids || ids.length === 0) {
          console.log(chalk.dim(`No translations to ${verb} for locale "${locale}".`));
          return;
        }
        console.log(`This will ${verb} ${pluralize(ids.length)} in locale "${locale}":`);
        printKeys(ids, options.type);
        const proceed = await confirm({
          message:
            options.type === TranslationUpdateType.UPDATE_EXISTING
              ? `Overwrite ${pluralize(ids.length)} in Localess? Edits made in Localess since your last pull will be lost.`
              : `Delete ${pluralize(ids.length)} from Localess?`,
          default: false,
        });
        if (!proceed) {
          console.log('Aborted.');
          process.exit(1);
          return;
        }
      }

      const { ids } = await client.updateTranslations(locale, options.type, translationValues, options.dryRun);
      if (!ids || ids.length === 0) {
        console.log(chalk.dim(`No translations to ${verb} for locale "${locale}".`));
      } else if (options.dryRun) {
        console.log(`Dry run: would ${verb} ${pluralize(ids.length)} in locale "${locale}":`);
        printKeys(ids, options.type);
      } else {
        console.log(chalk.green(`${past} ${pluralize(ids.length)} in locale "${locale}".`));
        if (!needsConfirmation) printKeys(ids, options.type);
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to push translations to Localess:', error);
      }
      process.exit(1);
    }
  });
