import { Command } from 'commander';

import { schemaDiffCommand } from './diff';
import { schemaPullCommand } from './pull';
import { schemaPushCommand } from './push';
import { schemaValidateCommand } from './validate';

export const schemaCommand = new Command('schema')
  .description('Sync code-defined schemas with your Localess space')
  .addCommand(schemaValidateCommand)
  .addCommand(schemaPullCommand)
  .addCommand(schemaDiffCommand)
  .addCommand(schemaPushCommand);
