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
import { typesCommand } from './index';

describe('types command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs an error and does not contact the network when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await typesCommand.parseAsync(['generate'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Not logged in');
    expect(localessCliClient).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('fetches schemas from the mocked client and writes generated types via a mocked file write', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getSchemas = vi.fn().mockResolvedValue({ schemas: [] });
    vi.mocked(localessCliClient).mockReturnValue({ getSchemas } as unknown as ReturnType<typeof localessCliClient>);

    await typesCommand.parseAsync(['generate', '-p', 'generated/localess.ts'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' });
    expect(getSchemas).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith('generated/localess.ts', expect.any(String));
  });

  it('writes to the default .localess/localess.ts path when no --path option is given', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getSchemas = vi.fn().mockResolvedValue({ schemas: [] });
    vi.mocked(localessCliClient).mockReturnValue({ getSchemas } as unknown as ReturnType<typeof localessCliClient>);

    await typesCommand.parseAsync(['generate'], { from: 'user' });

    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.localess'), expect.any(String));
  });
});
