import { beforeEach, describe, expect, it, vi } from 'vitest';

// Prevent session.ts from touching the real credentials file on disk.
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn(),
    readFile: vi.fn(),
  };
});

// Prevent session.ts (via persistSession) from writing credentials.json / .gitignore for real.
vi.mock('../../file', async () => {
  const actual = await vi.importActual<typeof import('../../file')>('../../file');
  return {
    ...actual,
    writeFile: vi.fn(),
    ensureGitignore: vi.fn(),
  };
});

// Prevent any real network call to a Localess instance.
vi.mock('../../client', () => ({
  localessCliClient: vi.fn(),
}));

import { access } from 'node:fs/promises';

import { localessCliClient } from '../../client';
import { ensureGitignore, writeFile } from '../../file';
import { loginCommand } from './index';

describe('login command', () => {
  beforeEach(() => {
    delete process.env.LOCALESS_TOKEN;
    delete process.env.LOCALESS_ORIGIN;
    delete process.env.LOCALESS_SPACE;
    vi.clearAllMocks();
    // Simulate no credentials file present yet, so getSession() falls through to isLoggedIn: false.
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));
  });

  it('short-circuits without contacting the network when already logged in via environment variables', async () => {
    process.env.LOCALESS_ORIGIN = 'https://demo.localess.org/';
    process.env.LOCALESS_SPACE = 'dummy-space-id';
    process.env.LOCALESS_TOKEN = 'dummy-token';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await loginCommand.parseAsync([], { from: 'user' });

    expect(logSpy).toHaveBeenCalledWith('Already logged in.');
    expect(localessCliClient).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('logs in with CLI options, calling the mocked client and persisting the session via mocked file writes', async () => {
    const getSpace = vi.fn().mockResolvedValue({ id: 'MmaT4DL0kJ6nXIILUcQF', name: 'Demo Space' });
    vi.mocked(localessCliClient).mockReturnValue({ getSpace } as unknown as ReturnType<typeof localessCliClient>);

    await loginCommand.parseAsync(
      ['--origin', 'https://demo.localess.org', '--space', 'MmaT4DL0kJ6nXIILUcQF', '--token', 'flXVeAzOYCarsy3pYZt8'],
      { from: 'user' }
    );

    expect(localessCliClient).toHaveBeenCalledWith({
      origin: 'https://demo.localess.org',
      spaceId: 'MmaT4DL0kJ6nXIILUcQF',
      token: 'flXVeAzOYCarsy3pYZt8',
    });
    expect(getSpace).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('credentials.json'),
      JSON.stringify({ origin: 'https://demo.localess.org', space: 'MmaT4DL0kJ6nXIILUcQF', token: 'flXVeAzOYCarsy3pYZt8' }, null, 2),
      { mode: 0o600 }
    );
    expect(ensureGitignore).toHaveBeenCalledWith(process.cwd(), '.localess');
  });

  it('passes debug: true to the client when --verbose is provided', async () => {
    const getSpace = vi.fn().mockResolvedValue({ id: 'space-1', name: 'Demo Space' });
    vi.mocked(localessCliClient).mockReturnValue({ getSpace } as unknown as ReturnType<typeof localessCliClient>);

    await loginCommand.parseAsync(
      ['--origin', 'https://demo.localess.org', '--space', 'space-1', '--token', 'token-123', '--verbose'],
      { from: 'user' }
    );

    expect(localessCliClient).toHaveBeenCalledWith({
      origin: 'https://demo.localess.org',
      spaceId: 'space-1',
      token: 'token-123',
      debug: true,
    });
  });

  it('exits with code 1 and does not persist credentials when the mocked client call fails', async () => {
    const getSpace = vi.fn().mockRejectedValue(new Error('network error'));
    vi.mocked(localessCliClient).mockReturnValue({ getSpace } as unknown as ReturnType<typeof localessCliClient>);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(
      loginCommand.parseAsync(['--origin', 'https://demo.localess.org', '--space', 'space-1', '--token', 'token-123'], {
        from: 'user',
      })
    ).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Login failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(writeFile).not.toHaveBeenCalled();
    expect(ensureGitignore).not.toHaveBeenCalled();
  });
});
