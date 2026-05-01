import { beforeEach, describe, it } from 'vitest';

import { clearSession } from '../../session';
import { loginCommand } from './index';

describe('login command', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.LOCALESS_TOKEN;
    delete process.env.LOCALESS_ORIGIN;
    delete process.env.LOCALESS_SPACE;
    // Clear any persisted session if necessary
    clearSession();
  });

  it('should run login with environment variables', async () => {
    // imitiate environment variables for testing
    process.env.LOCALESS_ORIGIN = 'https://demo.localess.org/';
    process.env.LOCALESS_SPACE = 'dummy-space-id';
    process.env.LOCALESS_TOKEN = 'dummy-token';

    await loginCommand.parseAsync([], { from: 'user' });
  });

  it('should run login with options', async () => {
    await loginCommand.parseAsync(
      ['--origin', 'https://demo.localess.org', '--space', 'MmaT4DL0kJ6nXIILUcQF', '--token', 'flXVeAzOYCarsy3pYZt8'],
      { from: 'user' }
    );
  });
});
