import { Command } from 'commander';

import { typeGenerateCommand } from './generate';

export const typeCommand = new Command('type')
  .alias('types')
  .description('Generate types for your schemas')
  .addCommand(typeGenerateCommand);
