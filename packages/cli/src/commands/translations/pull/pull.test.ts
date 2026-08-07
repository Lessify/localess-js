import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../client', () => ({
  localessCliClient: vi.fn(),
}));
vi.mock('../../../file', () => ({
  writeFile: vi.fn(),
}));
vi.mock('../../../session', () => ({
  getSession: vi.fn(),
}));

import { localessCliClient } from '../../../client';
import { writeFile } from '../../../file';
import { getSession } from '../../../session';
import { translationsPullCommand } from './index';

describe('translationsPullCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an invalid --format value without checking the session', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(
      translationsPullCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'not-a-real-format'], { from: 'user' })
    ).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Invalid format provided. Possible values are :', expect.any(Array));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('logs an error and exits with code 1 when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(translationsPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Not logged in');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(localessCliClient).not.toHaveBeenCalled();
  });

  it('exits with code 1 when the client fails to fetch translations', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getTranslations = vi.fn().mockRejectedValue(new Error('network down'));
    vi.mocked(localessCliClient).mockReturnValue({ getTranslations } as unknown as ReturnType<typeof localessCliClient>);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(translationsPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

    expect(errorSpy).toHaveBeenCalledWith('Failed to pull translations from Localess:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('pulls translations and writes them flat by default', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getTranslations = vi.fn().mockResolvedValue({ 'nav.home': 'Home', 'nav.about': 'About' });
    vi.mocked(localessCliClient).mockReturnValue({ getTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationsPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({ origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' });
    expect(getTranslations).toHaveBeenCalledWith('en', { version: undefined });
    expect(writeFile).toHaveBeenCalledWith('translations.json', JSON.stringify({ 'nav.about': 'About', 'nav.home': 'Home' }, null, 2));
  });

  it('nests the translations before writing when format is nested', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getTranslations = vi.fn().mockResolvedValue({ 'nav.home': 'Home' });
    vi.mocked(localessCliClient).mockReturnValue({ getTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationsPullCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'nested'], { from: 'user' });

    expect(writeFile).toHaveBeenCalledWith('translations.json', JSON.stringify({ nav: { home: 'Home' } }, null, 2));
  });

  it('passes debug: true to the client when --verbose is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getTranslations = vi.fn().mockResolvedValue({});
    vi.mocked(localessCliClient).mockReturnValue({ getTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationsPullCommand.parseAsync(['en', '-p', 'translations.json', '--verbose'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({
      origin: 'https://cms.example.com',
      spaceId: 'space-1',
      token: 'token-123',
      debug: true,
    });
  });

  it('requests the draft version when --draft is passed', async () => {
    vi.mocked(getSession).mockResolvedValue({
      isLoggedIn: true,
      origin: 'https://cms.example.com',
      space: 'space-1',
      token: 'token-123',
    });
    const getTranslations = vi.fn().mockResolvedValue({});
    vi.mocked(localessCliClient).mockReturnValue({ getTranslations } as unknown as ReturnType<typeof localessCliClient>);

    await translationsPullCommand.parseAsync(['en', '-p', 'translations.json', '--draft'], { from: 'user' });

    expect(getTranslations).toHaveBeenCalledWith('en', { version: 'draft' });
  });
});
