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

function mockClient(overrides: { updateTranslations?: ReturnType<typeof vi.fn> } = {}) {
  const updateTranslations =
    overrides.updateTranslations ?? vi.fn().mockResolvedValue({ message: 'Updated 1 translation', ids: ['nav.home'] });
  vi.mocked(localessCliClient).mockReturnValue({ updateTranslations } as unknown as ReturnType<typeof localessCliClient>);
  return { updateTranslations };
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

  function loggedIn(file: Record<string, string>) {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(file));
  }

  function logLines(logSpy: { mock: { calls: unknown[][] } }): string[] {
    return logSpy.mock.calls.map(call => call.join(' '));
  }

  it('exits with code 1 when the client fails to push translations', async () => {
    loggedIn({ 'nav.home': 'Home' });
    mockClient({ updateTranslations: vi.fn().mockRejectedValue(new Error('network down')) });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Failed to push translations to Localess:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  describe('result output', () => {
    it('prints the pushed keys with a pluralized summary', async () => {
      loggedIn({ 'nav.fresh': 'Fresh' });
      mockClient({ updateTranslations: vi.fn().mockResolvedValue({ message: 'Added 1 translation', ids: ['nav.fresh'] }) });
      const logSpy = vi.spyOn(console, 'log');

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

      const logs = logLines(logSpy);
      expect(logs.some(line => line.includes('Added 1 translation in locale "en".'))).toBe(true);
      expect(logs.some(line => line.includes('+ nav.fresh'))).toBe(true);
    });

    it('reports a dry run as what would happen', async () => {
      loggedIn({ 'nav.fresh': 'Fresh', 'nav.other': 'Other' });
      mockClient({
        updateTranslations: vi
          .fn()
          .mockResolvedValue({ message: '[DryRun] Would add 2 translations', ids: ['nav.fresh', 'nav.other'], dryRun: true }),
      });
      const logSpy = vi.spyOn(console, 'log');

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '--dry-run'], { from: 'user' });

      const logs = logLines(logSpy);
      expect(logs.some(line => line.includes('Dry run: would add 2 translations in locale "en":'))).toBe(true);
      expect(logs.some(line => line.includes('Successfully pushed'))).toBe(false);
    });

    it('reports when there is nothing to push', async () => {
      loggedIn({ 'nav.home': 'Home' });
      mockClient({ updateTranslations: vi.fn().mockResolvedValue({ message: 'No translations to add', ids: [] }) });
      const logSpy = vi.spyOn(console, 'log');

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

      expect(logLines(logSpy).some(line => line.includes('No translations to add for locale "en".'))).toBe(true);
    });
  });

  describe('--type update-existing', () => {
    it('previews via a server dry run, prompts, and pushes when confirmed', async () => {
      loggedIn({ 'nav.home': 'Home page' });
      const { updateTranslations } = mockClient({
        updateTranslations: vi.fn().mockResolvedValue({ message: 'Updated 1 translation', ids: ['nav.home'] }),
      });
      confirmMock.mockResolvedValue(true);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing'], { from: 'user' });

      expect(updateTranslations).toHaveBeenNthCalledWith(1, 'en', 'update-existing', { 'nav.home': 'Home page' }, true);
      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(updateTranslations).toHaveBeenNthCalledWith(2, 'en', 'update-existing', { 'nav.home': 'Home page' }, undefined);
    });

    it('aborts without pushing when the user declines confirmation', async () => {
      loggedIn({ 'nav.home': 'Home page' });
      const { updateTranslations } = mockClient({
        updateTranslations: vi.fn().mockResolvedValue({ message: '[DryRun] Would update 1 translation', ids: ['nav.home'], dryRun: true }),
      });
      confirmMock.mockResolvedValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing'], { from: 'user' });

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(updateTranslations).toHaveBeenCalledTimes(1);
      expect(updateTranslations).toHaveBeenCalledWith('en', 'update-existing', { 'nav.home': 'Home page' }, true);
    });

    it('skips the preview and confirmation when --yes is passed', async () => {
      loggedIn({ 'nav.home': 'Home page' });
      const { updateTranslations } = mockClient();

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing', '-y'], { from: 'user' });

      expect(confirmMock).not.toHaveBeenCalled();
      expect(updateTranslations).toHaveBeenCalledTimes(1);
      expect(updateTranslations).toHaveBeenCalledWith('en', 'update-existing', { 'nav.home': 'Home page' }, undefined);
    });

    it('does not prompt or push when nothing differs', async () => {
      loggedIn({ 'nav.home': 'Home' });
      const { updateTranslations } = mockClient({
        updateTranslations: vi.fn().mockResolvedValue({ message: 'No translations to update', ids: [], dryRun: true }),
      });
      const logSpy = vi.spyOn(console, 'log');

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'update-existing'], { from: 'user' });

      expect(confirmMock).not.toHaveBeenCalled();
      expect(updateTranslations).toHaveBeenCalledTimes(1);
      expect(logLines(logSpy).some(line => line.includes('No translations to update for locale "en".'))).toBe(true);
    });
  });

  describe('--type delete-missing', () => {
    it('lists the keys to delete, prompts, and pushes when confirmed', async () => {
      loggedIn({ 'nav.home': 'Home' });
      const { updateTranslations } = mockClient({
        updateTranslations: vi.fn().mockResolvedValue({ message: 'Deleted 1 translation', ids: ['nav.old'] }),
      });
      confirmMock.mockResolvedValue(true);
      const logSpy = vi.spyOn(console, 'log');

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'delete-missing'], { from: 'user' });

      expect(logLines(logSpy).some(line => line.includes('- nav.old'))).toBe(true);
      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Delete 1 translation from Localess?' }));
      expect(updateTranslations).toHaveBeenNthCalledWith(2, 'en', 'delete-missing', { 'nav.home': 'Home' }, undefined);
    });

    it('aborts without pushing when the user declines confirmation', async () => {
      loggedIn({ 'nav.home': 'Home' });
      const { updateTranslations } = mockClient({
        updateTranslations: vi.fn().mockResolvedValue({ message: '[DryRun] Would delete 1 translation', ids: ['nav.old'], dryRun: true }),
      });
      confirmMock.mockResolvedValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'delete-missing'], { from: 'user' });

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(updateTranslations).toHaveBeenCalledTimes(1);
    });
  });
});
