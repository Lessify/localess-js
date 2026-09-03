import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTranslations = vi.fn();
vi.mock('../../../client', () => ({ localessCliClient: () => ({ getTranslations }) }));
vi.mock('../../../file', () => ({ readFile: vi.fn() }));
vi.mock('../../../session', () => ({
  getSession: async () => ({ isLoggedIn: true, token: 't'.repeat(20), space: 'space1', origin: 'http://localhost' }),
}));

import { readFile } from '../../../file';
import { translationCommand } from '../index';

describe('translations diff', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getTranslations.mockReset();
    vi.mocked(readFile).mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('exits 0 when everything is unchanged', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    getTranslations.mockResolvedValue({ 'nav.home': 'Home' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json'], { from: 'user' });

    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  it('exits 1 when a local value differs from the remote value', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home page' }));
    getTranslations.mockResolvedValue({ 'nav.home': 'Home' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json'], { from: 'user' });

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits 1 when the remote has a stale key not present locally', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    getTranslations.mockResolvedValue({ 'nav.home': 'Home', 'nav.stale': 'Stale' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json'], { from: 'user' });

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('converts a nested local file to flat before diffing', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ nav: { home: 'Home' } }));
    getTranslations.mockResolvedValue({ 'nav.home': 'Home' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json', '-f', 'nested'], { from: 'user' });

    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  it('exits 1 when the local translations file fails schema validation', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 123 }));
    getTranslations.mockResolvedValue({});

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith('Invalid translations file format:', expect.anything());
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('passes the draft flag through to the client', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    getTranslations.mockResolvedValue({ 'nav.home': 'Home' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json', '--draft'], { from: 'user' });

    expect(getTranslations).toHaveBeenCalledWith('en', { version: 'draft' });
  });

  it('exits 1 when fetching remote translations fails', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    getTranslations.mockRejectedValue(new Error('network down'));

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith('Failed to diff translations:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('groups output by status and omits unchanged keys by default', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'new.key': 'New', 'changed.key': 'Changed', 'same.key': 'Same' }));
    getTranslations.mockResolvedValue({ 'changed.key': 'Old', 'same.key': 'Same', 'stale.key': 'Stale' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json'], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Create (1)'))).toBe(true);
    expect(logs.some(line => line.includes('new.key'))).toBe(true);
    expect(logs.some(line => line.includes('Update (1)'))).toBe(true);
    expect(logs.some(line => line.includes('changed.key'))).toBe(true);
    expect(logs.some(line => line.includes('Stale (1)'))).toBe(true);
    expect(logs.some(line => line.includes('stale.key'))).toBe(true);
    expect(logs.some(line => line.includes('Unchanged'))).toBe(false);
    expect(logs.some(line => line.includes('same.key'))).toBe(false);
    expect(logs.some(line => line.includes('1 unchanged (use --all to show)'))).toBe(true);
  });

  it('also prints unchanged keys with --all', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'same.key': 'Same' }));
    getTranslations.mockResolvedValue({ 'same.key': 'Same' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'translations.json', '--all'], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Unchanged (1)'))).toBe(true);
    expect(logs.some(line => line.includes('same.key'))).toBe(true);
  });
});
