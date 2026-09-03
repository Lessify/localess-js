import { Command } from 'commander';

import { translationDiffCommand } from './diff';
import { translationPullCommand } from './pull';
import { translationPushCommand } from './push';

export const translationCommand = new Command('translation')
  .alias('translations')
  .description('Manage translations')
  .addCommand(translationPushCommand)
  .addCommand(translationPullCommand)
  .addCommand(translationDiffCommand);
