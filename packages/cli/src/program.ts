import { Command } from 'commander';

import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { translationsCommand } from './commands/translations';
import { typesCommand } from './commands/types';

export const program = new Command();

program.name('Localess CLI').description('CLI tool for Localess platform management').version('3.0.5');

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(translationsCommand);
program.addCommand(typesCommand);
