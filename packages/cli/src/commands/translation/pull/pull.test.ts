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
import { LocalessApiError } from '../../../models';
import { getSession } from '../../../session';
import { translationPullCommand } from './index';

describe('translationPullCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an invalid --format value without checking the session', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(
      translationPullCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'not-a-real-format'], { from: 'user' })
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

    await expect(translationPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

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

    await expect(translationPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' })).rejects.toThrow('exit');

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

    await translationPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

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

    await translationPullCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'nested'], { from: 'user' });

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

    await translationPullCommand.parseAsync(['en', '-p', 'translations.json', '--verbose'], { from: 'user' });

    expect(localessCliClient).toHaveBeenCalledWith({
      origin: 'https://cms.example.com',
      spaceId: 'space-1',
      token: 'token-123',
      debug: true,
    });
  });

  describe('--raw', () => {
    function loggedIn() {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
    }

    it('writes the stored values instead of the fallback-filled published file', async () => {
      loggedIn();
      const getTranslationValues = vi.fn().mockResolvedValue({ 'nav.home': 'Startseite' });
      const getTranslations = vi.fn();
      vi.mocked(localessCliClient).mockReturnValue({ getTranslationValues, getTranslations } as unknown as ReturnType<
        typeof localessCliClient
      >);

      await translationPullCommand.parseAsync(['de', '-p', 'de.json', '--raw'], { from: 'user' });

      expect(getTranslationValues).toHaveBeenCalledWith('de');
      expect(getTranslations).not.toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith('de.json', JSON.stringify({ 'nav.home': 'Startseite' }, null, 2));
    });

    it('refuses to combine --raw with --draft', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await expect(translationPullCommand.parseAsync(['de', '-p', 'de.json', '--raw', '--draft'], { from: 'user' })).rejects.toThrow(
        'exit'
      );

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--raw and --draft cannot be combined'));
      expect(getSession).not.toHaveBeenCalled();
    });

    it('explains a 404 as a platform too old for --raw', async () => {
      loggedIn();
      const notFound = new LocalessApiError(404, 'Not Found', 'url', undefined, 'hint');
      vi.mocked(localessCliClient).mockReturnValue({
        getTranslationValues: vi.fn().mockRejectedValue(notFound),
      } as unknown as ReturnType<typeof localessCliClient>);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await expect(translationPullCommand.parseAsync(['de', '-p', 'de.json', '--raw'], { from: 'user' })).rejects.toThrow('exit');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('newer than 4.0.0'));
    });
  });

  describe('locale check', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue({
        isLoggedIn: true,
        origin: 'https://cms.example.com',
        space: 'space-1',
        token: 'token-123',
      });
    });

    it('refuses a locale the space does not have, instead of saving the fallback file', async () => {
      const getTranslations = vi.fn();
      vi.mocked(localessCliClient).mockReturnValue({
        getSpace: vi.fn().mockResolvedValue({ locales: [{ id: 'en' }, { id: 'de' }] }),
        getTranslations,
      } as unknown as ReturnType<typeof localessCliClient>);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await expect(translationPullCommand.parseAsync(['dee', '-p', 'de.json'], { from: 'user' })).rejects.toThrow('exit');

      expect(errorSpy).toHaveBeenCalledWith("Locale 'dee' is not in this space. Available locales: en, de");
      expect(getTranslations).not.toHaveBeenCalled();
    });

    it('reads the space silently and skips the check when the token cannot read it', async () => {
      const getSpace = vi.fn().mockRejectedValue(new LocalessApiError(403, 'Forbidden', 'url', undefined, 'hint'));
      const getTranslations = vi.fn().mockResolvedValue({ 'nav.home': 'Home' });
      vi.mocked(localessCliClient).mockReturnValue({ getSpace, getTranslations } as unknown as ReturnType<typeof localessCliClient>);

      await translationPullCommand.parseAsync(['en', '-p', 'en.json'], { from: 'user' });

      expect(getSpace).toHaveBeenCalledWith({ silent: true });
      expect(writeFile).toHaveBeenCalled();
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

    await translationPullCommand.parseAsync(['en', '-p', 'translations.json', '--draft'], { from: 'user' });

    expect(getTranslations).toHaveBeenCalledWith('en', { version: 'draft' });
  });
});
