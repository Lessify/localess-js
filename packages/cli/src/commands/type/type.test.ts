import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../client', () => ({
  localessCliClient: vi.fn(),
}));
vi.mock('../../file', async () => {
  const actual = await vi.importActual<typeof import('../../file')>('../../file');
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});
vi.mock('../../session', () => ({
  getSession: vi.fn(),
}));

import { localessCliClient } from '../../client';
import { writeFile } from '../../file';
import { getSession } from '../../session';
import { typeCommand } from './index';

describe('types command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs an error and exits with code 1 when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(typeCommand.parseAsync(['generate'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Not logged in');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(localessCliClient).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('passes debug: true to the client when --verbose is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getSchemas = vi.fn().mockResolvedValue([]);
    vi.mocked(localessCliClient).mockReturnValue({ getSchemas } as unknown as ReturnType<typeof localessCliClient>);

    await typeCommand.parseAsync(['generate', '--verbose'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({
      origin: 'https://cms.example.com',
      spaceId: 'space-1',
      token: 'token-123',
      debug: true,
    });
  });

  it('exits with code 1 when the client fails to fetch schemas', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getSchemas = vi.fn().mockRejectedValue(new Error('network down'));
    vi.mocked(localessCliClient).mockReturnValue({ getSchemas } as unknown as ReturnType<typeof localessCliClient>);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(typeCommand.parseAsync(['generate'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Failed to generate types:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('fetches schemas from the mocked client and writes generated types via a mocked file write', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getSchemas = vi.fn().mockResolvedValue([]);
    vi.mocked(localessCliClient).mockReturnValue({ getSchemas } as unknown as ReturnType<typeof localessCliClient>);

    await typeCommand.parseAsync(['generate', '-p', 'generated/localess.ts'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' });
    expect(getSchemas).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith('generated/localess.ts', expect.any(String));
  });

  it('writes to the default .localess/localess.d.ts path when no --path option is given', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getSchemas = vi.fn().mockResolvedValue([]);
    vi.mocked(localessCliClient).mockReturnValue({ getSchemas } as unknown as ReturnType<typeof localessCliClient>);

    await typeCommand.parseAsync(['generate'], { from: 'user' });

    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining(join('.localess', 'localess.d.ts')), expect.any(String));
  });
});
