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
import { translationsPushCommand } from './index';

describe('translationsPushCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an invalid --type value without checking the session', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await translationsPushCommand.parseAsync(['en', '-p', 'translations.json', '-t', 'not-a-real-type'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Invalid type provided. Possible values are :', expect.any(Array));
    expect(getSession).not.toHaveBeenCalled();
  });

  it('logs an error and exits early when not logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ isLoggedIn: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await translationsPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Not logged in');
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

    await translationsPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

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

    await translationsPushCommand.parseAsync(['en', '-p', 'translations.json', '-f', 'nested'], { from: 'user' });

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

    await translationsPushCommand.parseAsync(['en', '-p', 'translations.json', '--dry-run'], { from: 'user' });

    expect(updateTranslations).toHaveBeenCalledWith('en', 'add-missing', { 'nav.home': 'Home' }, true);
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

    await translationsPushCommand.parseAsync(['en', '-p', 'translations.json'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalledWith('Invalid translations file format:', expect.anything());
  });
});
