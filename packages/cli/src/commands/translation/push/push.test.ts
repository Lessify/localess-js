import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirmMock = vi.fn();
vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => confirmMock(...args),
}));
vi.mock('../../../client', () => ({
  localessCliClient: vi.fn(),
}));
vi.mock('../../../file', () => ({
  readFile: vi.fn(),
}));
vi.mock('../../../session', () => ({
  getSession: vi.fn(),
}));

import { localessCliClient } from '../../../client';
import { readFile } from '../../../file';
import { getSession } from '../../../session';
import { translationPushCommand } from './index';

function mockClient(overrides: { getTranslations?: ReturnType<typeof vi.fn>; updateTranslations?: ReturnType<typeof vi.fn> } = {}) {
  const getTranslations = overrides.getTranslations ?? vi.fn().mockResolvedValue({});
  const updateTranslations = overrides.updateTranslations ?? vi.fn().mockResolvedValue({ message: 'Updated 1 translation', ids: ['1'] });
  vi.mocked(localessCliClient).mockReturnValue({ getTranslations, updateTranslations } as unknown as ReturnType<typeof localessCliClient>);
  return { getTranslations, updateTranslations };
}

describe('translationPushCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(true);
  });

  it('rejects an invalid --type value without checking the session', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(
      translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'not-a-real-type'], { from: 'user' })
    ).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Invalid type provided. Possible values are :', expect.any(Array));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('logs an error and exits with code 1 when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Not logged in');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(localessCliClient).not.toHaveBeenCalled();
  });

  it('reads a flat translations file and pushes it when logged in (add-missing, no confirmation)', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    const { updateTranslations } = mockClient();

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' });
    expect(updateTranslations).toHaveBeenCalledWith('en', 'add-missing', { 'nav.home': 'Home' }, undefined);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('converts a nested translations file to flat before validating and pushing', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ nav: { home: 'Home' } }));
    const { updateTranslations } = mockClient();

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'nested'], { from: 'user' });

    expect(updateTranslations).toHaveBeenCalledWith('en', 'add-missing', { 'nav.home': 'Home' }, undefined);
  });

  it('passes the dry-run flag through to the client and skips confirmation', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    const { updateTranslations } = mockClient({
      getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Old' }),
      updateTranslations: vi.fn().mockResolvedValue({ message: 'Preview', dryRun: true }),
    });

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '--dry-run', '-t', 'update-existing'], { from: 'user' });

    expect(updateTranslations).toHaveBeenCalledWith('en', 'update-existing', { 'nav.home': 'Home' }, true);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('passes debug: true to the client when --verbose is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    mockClient();

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '--verbose'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({
      origin: 'https://cms.example.com',
      spaceId: 'space-1',
      token: 'token-123',
      debug: true,
    });
  });

  it('rejects a translations file that fails schema validation without pushing', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 123 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    mockClient();

    await expect(translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Invalid translations file format:', expect.anything());
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when the client fails to push translations', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    mockClient({ getTranslations: vi.fn().mockRejectedValue(new Error('network down')) });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Failed to push translations to Localess:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  describe('--type update-existing', () => {
    it('prompts for confirmation when keys differ, and proceeds when confirmed', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home page' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home' }) });
      confirmMock.mockResolvedValue(true);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing'], { from: 'user' });

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(updateTranslations).toHaveBeenCalledWith('en', 'update-existing', { 'nav.home': 'Home page' }, undefined);
    });

    it('aborts without pushing when the user declines confirmation', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home page' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home' }) });
      confirmMock.mockResolvedValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing'], { from: 'user' });

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(updateTranslations).not.toHaveBeenCalled();
    });

    it('skips the confirmation prompt when --yes is passed', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home page' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home' }) });

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing', '-y'], { from: 'user' });

      expect(confirmMock).not.toHaveBeenCalled();
      expect(updateTranslations).toHaveBeenCalledWith('en', 'update-existing', { 'nav.home': 'Home page' }, undefined);
    });

    it('skips the confirmation prompt entirely when nothing differs', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home' }) });

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing'], { from: 'user' });

      expect(confirmMock).not.toHaveBeenCalled();
      expect(updateTranslations).toHaveBeenCalledWith('en', 'update-existing', { 'nav.home': 'Home' }, undefined);
    });
  });

  describe('--type delete-missing', () => {
    it('prompts for confirmation when the remote has stale keys, and proceeds when confirmed', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home', 'nav.old': 'Old' }) });
      confirmMock.mockResolvedValue(true);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'delete-missing'], { from: 'user' });

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(updateTranslations).toHaveBeenCalledWith('en', 'delete-missing', { 'nav.home': 'Home' }, undefined);
    });

    it('aborts without pushing when the user declines confirmation', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home', 'nav.old': 'Old' }) });
      confirmMock.mockResolvedValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'delete-missing'], { from: 'user' });

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(updateTranslations).not.toHaveBeenCalled();
    });

    it('skips the confirmation prompt when nothing is stale', async () => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
      const { updateTranslations } = mockClient({ getTranslations: vi.fn().mockResolvedValue({ 'nav.home': 'Home' }) });

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'delete-missing'], { from: 'user' });

      expect(confirmMock).not.toHaveBeenCalled();
      expect(updateTranslations).toHaveBeenCalledWith('en', 'delete-missing', { 'nav.home': 'Home' }, undefined);
    });
  });
});
