import { Command } from 'commander';

import { version } from '../package.json';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { translationsCommand } from './commands/translations';
import { typesCommand } from './commands/types';
import { checkForUpdate } from './version-check';

export const program = new Command();

program.name('Localess CLI').description('CLI tool for Localess platform management').version(version);

let updateCheckPromise: Promise<string | null>;

program.hook('preAction', () => {
  updateCheckPromise = checkForUpdate(version);
});

program.hook('postAction', async () => {
  const message = await updateCheckPromise;
  if (message) console.log(message);
});

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(translationsCommand);
program.addCommand(typesCommand);
