import { join } from 'node:path';
import process from 'node:process';

import { Command } from 'commander';

import { localessCliClient } from '../../../client';
import { DEFAULT_CONFIG_DIR, writeFile } from '../../../file';
import { LocalessApiError } from '../../../models';
import { getSession } from '../../../session';
import { generateTypes } from './generator';

const TYPES_PATH = join(process.cwd(), DEFAULT_CONFIG_DIR, 'localess.d.ts');

type TypesOptions = {
  path: string;
  prefix: string;
  verbose?: boolean;
};

export const typeGenerateCommand = new Command('generate')
  .description('Generate types for your schemas')
  .option('-p, --path <path>', 'Path to the file where to save the generated types. Default is .localess/localess.d.ts', TYPES_PATH)
  .option('--prefix <prefix>', 'Prefix to prepend to all generated type names', '')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (options: TypesOptions) => {
    console.log('Types in with options:', options);

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

    try {
      console.log('Fetching schemas from Localess...');
      const specification = await client.getSchemas();
      console.log('Generating types...');
      const content = generateTypes(specification, options.prefix);
      await writeFile(options.path, content);
      console.log(`Types written to ${options.path}`);
    } catch (error) {
      if (!(error instanceof LocalessApiError)) {
        console.error('Failed to generate types:', error);
      }
      process.exit(1);
    }
  });
