import process from 'node:process';

import { Command } from 'commander';

import { loadSchemaConfig } from '../loader';
import { validate } from '../schema-lib';

type ValidateOptions = {
  format?: 'text' | 'json';
  verbose?: boolean;
};

export const schemaValidateCommand = new Command('validate')
  .description('Validate schema definitions offline (no login required)')
  .argument('<entry>', 'Path to the entry file exporting defineConfig()')
  .option('--format <format>', 'Output format: text or json', 'text')
  .option('-v, --verbose', 'Print verbose debug output')
  .action(async (entry: string, options: ValidateOptions) => {
    try {
      const config = await loadSchemaConfig(entry);
      const result = validate(config);
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const issue of result.issues) {
          const line = `${issue.severity.toUpperCase()} ${issue.code} ${issue.path} — ${issue.message}`;
          if (issue.severity === 'error') console.error(line);
          else console.log(line);
        }
        console.log(result.ok ? `Valid: ${config.schemas.length} schemas, ${result.issues.length} issues` : 'Validation failed');
      }
      if (!result.ok) {
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to validate schemas:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
