import { Command } from 'commander';

import { translationsPullCommand } from './pull';
import { translationsPushCommand } from './push';

export const translationsCommand = new Command('translations')
  .description('Manage translations')
  .addCommand(translationsPushCommand)
  .addCommand(translationsPullCommand);
