import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('translationPushCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('reads a flat translations file and pushes it when logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    const updateTranslations = vi.fn().mockResolvedValue({ message: 'Updated 1 translation', ids: ['1'] });
    vi.mocked(localessCliClient).mockReturnValue({ updateTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' });
    expect(updateTranslations).toHaveBeenCalledWith('en', 'add-missing', { 'nav.home': 'Home' }, undefined);
  });

  it('converts a nested translations file to flat before validating and pushing', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ nav: { home: 'Home' } }));
    const updateTranslations = vi.fn().mockResolvedValue({ message: 'Updated 1 translation' });
    vi.mocked(localessCliClient).mockReturnValue({ updateTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'nested'], { from: 'user' });

    expect(updateTranslations).toHaveBeenCalledWith('en', 'add-missing', { 'nav.home': 'Home' }, undefined);
  });

  it('passes the dry-run flag through to the client', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    const updateTranslations = vi.fn().mockResolvedValue({ message: 'Preview', dryRun: true });
    vi.mocked(localessCliClient).mockReturnValue({ updateTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationPushCommand.parseAsync(['en', '-p', 'translations.json', '--dry-run'], { from: 'user' });

    expect(updateTranslations).toHaveBeenCalledWith('en', 'add-missing', { 'nav.home': 'Home' }, true);
  });

  it('passes debug: true to the client when --verbose is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    const updateTranslations = vi.fn().mockResolvedValue({ message: 'Updated 1 translation' });
    vi.mocked(localessCliClient).mockReturnValue({ updateTranslations } as unknown as ReturnType<typeof localessCliClient>);

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
    const updateTranslations = vi.fn().mockRejectedValue(new Error('network down'));
    vi.mocked(localessCliClient).mockReturnValue({ updateTranslations } as unknown as ReturnType<typeof localessCliClient>);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(translationPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Failed to push translations to Localess:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
