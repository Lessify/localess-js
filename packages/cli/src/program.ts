import { Command } from 'commander';

import { version } from '../package.json';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { schemaCommand } from './commands/schema';
import { translationCommand } from './commands/translation';
import { typeCommand } from './commands/type';
import { checkPlatformCompatibility } from './platform-version';
import { checkForUpdate } from './version-check';

export const program = new Command();

program.name('Localess CLI').description('CLI tool for Localess platform management').version(version);

let updateCheckPromise: Promise<string | null>;

/**
 * Builds the space-separated path of the command about to run, e.g. `schema push`.
 * The root program is excluded, so a top-level command is just its own name.
 */
function commandPath(command: Command): string {
  const names: string[] = [];
  for (let current: Command | null = command; current?.parent; current = current.parent) {
    names.unshift(current.name());
  }
  return names.join(' ');
}

program.hook('preAction', async (_thisCommand, actionCommand) => {
  // Started first so the registry lookup overlaps the platform version fetch.
  updateCheckPromise = checkForUpdate(version);

  const result = await checkPlatformCompatibility(commandPath(actionCommand), version);
  if (result === 'blocked') {
    process.exit(1);
  }
});

program.hook('postAction', async () => {
  const message = await updateCheckPromise;
  if (message) console.log(message);
});

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(schemaCommand);
program.addCommand(translationCommand);
program.addCommand(typeCommand);
