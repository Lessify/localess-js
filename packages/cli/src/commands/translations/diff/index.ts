import chalk from 'chalk';
import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { readFile } from '../../../file';
import { LocalessApiError, TranslationFileFormat, Translations } from '../../../models';
import { zLocaleTranslationsSchema } from '../../../models';
import { getSession } from '../../../session';
import { nestedObjectToFlat } from '../../../utils';
import { diffTranslations, TranslationDiffEntry, TranslationDiffStatus } from './diff-translations';

export type TranslationsDiffOptions = {
  path: string;
  format: TranslationFileFormat;
  draft?: boolean;
  all?: boolean;
  verbose?: boolean;
};

const STATUS_ORDER: TranslationDiffStatus[] = ['create', 'update', 'stale', 'unchanged'];

const STATUS_STYLE: Record<TranslationDiffStatus, { symbol: string; label: string; color: typeof chalk.green }> = {
  create: { symbol: '+', label: 'Create', color: chalk.green },
  update: { symbol: '~', label: 'Update', color: chalk.yellow },
  stale: { symbol: '-', label: 'Stale', color: chalk.red },
  unchanged: { symbol: '=', label: 'Unchanged', color: chalk.dim },
};

function printGroups(entries: TranslationDiffEntry[], { all }: { all?: boolean }): void {
  const byStatus = new Map<TranslationDiffStatus, TranslationDiffEntry[]>();
  for (const entry of entries) {
    const group = byStatus.get(entry.status) ?? [];
    group.push(entry);
    byStatus.set(entry.status, group);
  }

  for (const status of STATUS_ORDER) {
    if (status === 'unchanged' && !all) continue;
    const group = byStatus.get(status);
    if (!group || group.length === 0) continue;
    const style = STATUS_STYLE[status];
    console.log(style.color.bold(`\n${style.label} (${group.length})`));
    for (const item of group) {
      console.log(style.color(`  ${style.symbol} ${item.key}`));
    }
  }

  const unchangedCount = byStatus.get('unchanged')?.length ?? 0;
  if (!all && unchangedCount > 0) {
    console.log(chalk.dim(`\n${unchangedCount} unchanged (use --all to show)`));
  }
}

export const translationsDiffCommand = new Command('diff')
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
      printGroups(entries, { all: options.all });

      const created = entries.filter(item => item.status === 'create').length;
      const updated = entries.filter(item => item.status === 'update').length;
      const stale = entries.filter(item => item.status === 'stale').length;
      const drift = created + updated + stale;
      if (drift > 0) {
        console.log(
          `\n${drift} translation(s) differ: ${chalk.green(`${created} created`)}, ${chalk.yellow(`${updated} updated`)}, ${chalk.red(`${stale} stale`)}.`
        );
        process.exit(1);
      } else {
        console.log(chalk.green('\nIn sync.'));
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to diff translations:', error);
      }
      process.exit(1);
    }
  });
