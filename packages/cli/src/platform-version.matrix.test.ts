import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import { COMMAND_REQUIREMENTS } from './platform-version';
import { program } from './program';

/** Every runnable command path, excluding the root program and Commander's built-in help. */
function commandPaths(command: Command, prefix: string[] = []): string[] {
  const paths: string[] = [];
  for (const child of command.commands) {
    if (child.name() === 'help') continue;
    const path = [...prefix, child.name()];
    const nested = commandPaths(child, path);
    // Only leaves are runnable; a group like `schema` just dispatches to its children.
    if (nested.length === 0) paths.push(path.join(' '));
    paths.push(...nested);
  }
  return paths;
}

describe('COMMAND_REQUIREMENTS', () => {
  it('covers every command exactly, with no missing or stale entries', () => {
    // Both directions on purpose: a new command without an entry would silently inherit
    // "skipped", and a removed command would leave a misleading entry behind.
    expect(Object.keys(COMMAND_REQUIREMENTS).sort()).toEqual(commandPaths(program).sort());
  });

  it('declares a parseable version for every command that talks to the platform', () => {
    for (const [command, minimum] of Object.entries(COMMAND_REQUIREMENTS)) {
      if (minimum === null) continue;
      expect(minimum, `${command} minimum`).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('exempts only the commands that never call the platform', () => {
    const exempt = Object.entries(COMMAND_REQUIREMENTS)
      .filter(([, minimum]) => minimum === null)
      .map(([command]) => command)
      .sort();

    // login/logout manage credentials; schema validate only reads local files.
    expect(exempt).toEqual(['login', 'logout', 'schema validate']);
  });
});
