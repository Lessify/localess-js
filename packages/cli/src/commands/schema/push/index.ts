import process from 'node:process';

import { confirm } from '@inquirer/prompts';
import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { printDiffReport } from '../../../diff-report';
import { LocalessApiError } from '../../../models';
import { getSession } from '../../../session';
import { diffSchemas } from '../diff-schemas';
import { loadSchemaConfig } from '../loader';
import { toSchemaExport, validate } from '../schema-lib';

type PushOptions = {
  dryRun?: boolean;
  delete?: boolean;
  all?: boolean;
  yes?: boolean;
  verbose?: boolean;
};

export const schemaPushCommand = new Command('push')
  .description('Push code-defined schemas to your Localess space')
  .argument('<entry>', 'Path to the entry file exporting defineConfig()')
  .option('--dry-run', 'Report what would change without writing')
  .option('--delete', 'Also delete schemas that exist on the server but not in code (sync mode)')
  .option('-a, --all', 'Also print unchanged schemas in the preview')
  .option('-y, --yes', 'Skip the deletion confirmation prompt')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (entry: string, options: PushOptions) => {
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
    try {
      const config = await loadSchemaConfig(entry);
      const validation = validate(config);
      for (const issue of validation.issues) {
        const line = `${issue.severity.toUpperCase()} ${issue.code} ${issue.path} — ${issue.message}`;
        if (issue.severity === 'error') console.error(line);
        else console.warn(line);
      }
      if (!validation.ok) {
        console.error('Aborting: fix validation errors before pushing.');
        process.exit(1);
        return;
      }
      const local = toSchemaExport(config);
      console.log('Fetching schemas from Localess...');
      const remote = await client.getSchemas();
      const entries = diffSchemas(local, remote);
      printDiffReport(
        entries.map(item => ({ label: item.id, status: item.status })),
        { all: options.all, noun: 'schema' }
      );
      const stale = entries.filter(item => item.status === 'stale').map(item => item.id);
      if (stale.length > 0 && !options.delete) {
        console.warn(`Stale on server (kept — use --delete to remove): ${stale.join(', ')}`);
      }
      if (stale.length > 0 && options.delete && !options.yes && !options.dryRun) {
        const proceed = await confirm({ message: `Delete ${stale.length} schema(s) from the server: ${stale.join(', ')}?` });
        if (!proceed) {
          console.log('Aborted.');
          process.exit(1);
          return;
        }
      }
      const response = await client.pushSchemas({
        type: options.delete ? 'sync' : 'upsert',
        ...(options.dryRun ? { dryRun: true } : {}),
        schemas: local,
      });
      const { counts } = response;
      console.log(
        `${response.dryRun ? '[DryRun] ' : ''}created: ${counts.created}, updated: ${counts.updated}, deleted: ${counts.deleted}, unchanged: ${counts.unchanged}`
      );
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to push schemas:', error);
      }
      process.exit(1);
    }
  });
