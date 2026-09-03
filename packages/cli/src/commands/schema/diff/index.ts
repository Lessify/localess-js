import process from 'node:process';

import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { printDiffReport } from '../../../diff-report';
import { LocalessApiError } from '../../../models';
import { getSession } from '../../../session';
import { diffSchemas } from '../diff-schemas';
import { loadSchemaConfig } from '../loader';
import { toSchemaExport } from '../schema-lib';

type DiffOptions = {
  all?: boolean;
  verbose?: boolean;
};

export const schemaDiffCommand = new Command('diff')
  .description('Compare code-defined schemas with your Localess space (exit 1 on drift)')
  .argument('<entry>', 'Path to the entry file exporting defineConfig()')
  .option('-a, --all', 'Also print unchanged schemas')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (entry: string, options: DiffOptions) => {
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
      const local = toSchemaExport(config);
      const remote = await client.getSchemas();
      const entries = diffSchemas(local, remote);
      const { drift } = printDiffReport(
        entries.map(item => ({ label: item.id, status: item.status })),
        { all: options.all, noun: 'schema' }
      );
      if (drift > 0) {
        process.exit(1);
      }
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to diff schemas:', error);
      }
      process.exit(1);
    }
  });
