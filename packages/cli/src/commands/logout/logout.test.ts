import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../session', () => ({
  getSession: vi.fn(),
  clearSession: vi.fn(),
}));

import { clearSession, getSession } from '../../session';
import { logoutCommand } from './index';

describe('logoutCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a message and does nothing when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await logoutCommand.parseAsync([], { from: 'user' });

    expect(logSpy).toHaveBeenCalledWith('Not currently logged in.');
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('instructs to unset environment variables when logged in via env', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
      method: 'env',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await logoutCommand.parseAsync([], { from: 'user' });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('environment variables'));
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('clears the persisted session when logged in via file', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
      method: 'file',
    });
    vi.mocked(clearSession).mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await logoutCommand.parseAsync([], { from: 'user' });

    expect(clearSession).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Successfully logged out.');
  });

  it('logs an error when clearing the session fails', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
      method: 'file',
    });
    vi.mocked(clearSession).mockRejectedValue(new Error('disk error'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await logoutCommand.parseAsync([], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Failed to log out:', expect.any(Error));
  });
});
