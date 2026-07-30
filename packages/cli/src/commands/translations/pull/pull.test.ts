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

    await translationsPullCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'not-a-real-format'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Invalid format provided. Possible values are :', expect.any(Array));
    expect(getSession).not.toHaveBeenCalled();
  });

  it('logs an error and exits early when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await translationsPullCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Not logged in');
    expect(localessCliClient).not.toHaveBeenCalled();
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
