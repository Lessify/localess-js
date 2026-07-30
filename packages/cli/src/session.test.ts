import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn(),
    readFile: vi.fn(),
  };
});

vi.mock('./file', async () => {
  const actual = await vi.importActual<typeof import('./file')>('./file');
  return {
    ...actual,
    writeFile: vi.fn(),
    ensureGitignore: vi.fn(),
  };
});

import { access, readFile } from 'node:fs/promises';

import { ensureGitignore, writeFile } from './file';
import { clearSession, getSession, persistSession } from './session';

describe('getSession', () => {
  beforeEach(() => {
    delete process.env.LOCALESS_TOKEN;
    delete process.env.LOCALESS_SPACE;
    delete process.env.LOCALESS_ORIGIN;
    vi.clearAllMocks();
  });

  it('returns isLoggedIn true using environment variables', async () => {
    process.env.LOCALESS_ORIGIN = 'https://cms.example.com';
    process.env.LOCALESS_SPACE = 'space-1';
    process.env.LOCALESS_TOKEN = 'token-123';

    const session = await getSession();

    expect(session).toEqual({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
      method: 'env',
    });
    expect(access).not.toHaveBeenCalled();
  });

  it('returns isLoggedIn false when no env vars and no credentials file exists', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

    const session = await getSession();

    expect(session).toEqual({ isLoggedIn: false });
  });

  it('reads credentials from the file system when env vars are absent', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ origin: 'https://cms.example.com', space: 'space-1', token: 'token-123' })
    );

    const session = await getSession();

    expect(session).toEqual({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
      method: 'file',
    });
  });

  it('returns isLoggedIn false when the credentials file is an empty object', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(readFile).mockResolvedValue('{}');

    const session = await getSession();

    expect(session).toEqual({ isLoggedIn: false });
  });

  it('returns isLoggedIn false when the credentials file is missing required fields', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ origin: 'https://cms.example.com' }));

    const session = await getSession();

    expect(session).toEqual({ isLoggedIn: false });
  });
});

describe('persistSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes credentials and ensures gitignore when all fields are present', async () => {
    await persistSession({ origin: 'https://cms.example.com', space: 'space-1', token: 'token-123' });

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('credentials.json'),
      JSON.stringify({ origin: 'https://cms.example.com', space: 'space-1', token: 'token-123' }, null, 2),
      { mode: 0o600 }
    );
    expect(ensureGitignore).toHaveBeenCalledWith(process.cwd(), '.localess');
  });

  it('throws when required fields are missing', async () => {
    await expect(persistSession({ origin: '', space: 'space-1', token: 'token-123' })).rejects.toThrow(
      'Cannot persist session: missing required fields.'
    );
    expect(writeFile).not.toHaveBeenCalled();
  });
});

describe('clearSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes an empty object to the credentials file when it exists', async () => {
    vi.mocked(access).mockResolvedValue(undefined);

    await clearSession();

    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('credentials.json'), '{}', { mode: 0o600 });
  });

  it('throws when the credentials file does not exist', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

    await expect(clearSession()).rejects.toThrow('Failed to clear session credentials.');
    expect(writeFile).not.toHaveBeenCalled();
  });
});
