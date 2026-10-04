import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTranslations = vi.fn();
const getTranslationValues = vi.fn();
const getSpace = vi.fn();
vi.mock('../../../client', () => ({ localessCliClient: () => ({ getTranslations, getTranslationValues, getSpace }) }));
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
    getTranslationValues.mockReset();
    getSpace.mockReset();
    getSpace.mockResolvedValue({ locales: [{ id: 'en' }, { id: 'de' }] });
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
    expect(logs.some(line => line.includes('Only in file (1)'))).toBe(true);
    expect(logs.some(line => line.includes('new.key'))).toBe(true);
    expect(logs.some(line => line.includes('Different (1)'))).toBe(true);
    expect(logs.some(line => line.includes('changed.key'))).toBe(true);
    expect(logs.some(line => line.includes('Only in Localess (1)'))).toBe(true);
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

  it('compares against stored values with --raw', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Startseite' }));
    getTranslationValues.mockResolvedValue({ 'nav.home': 'Startseite' });

    await translationCommand.parseAsync(['diff', 'de', '-p', 'de.json', '--raw'], { from: 'user' });

    expect(getTranslationValues).toHaveBeenCalledWith('de');
    expect(getTranslations).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  // The published file fills a German gap with English; stored values leave the gap, so a key only
  // translated locally is "Only in file", not "Different" against fallback text.
  it('reports a key untranslated in Localess as only in file with --raw', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Startseite' }));
    getTranslationValues.mockResolvedValue({});

    await translationCommand.parseAsync(['diff', 'de', '-p', 'de.json', '--raw'], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Only in file (1)'))).toBe(true);
    expect(logs.some(line => line.includes('Different'))).toBe(false);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('flattens a nested file before comparing with --raw', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ nav: { home: 'Startseite' } }));
    getTranslationValues.mockResolvedValue({ 'nav.home': 'Startseite' });

    await translationCommand.parseAsync(['diff', 'de', '-p', 'de.json', '--raw', '-f', 'nested'], { from: 'user' });

    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  it('rejects --raw with --draft before any request', async () => {
    await translationCommand.parseAsync(['diff', 'de', '-p', 'de.json', '--raw', '--draft'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--raw and --draft cannot be combined'));
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('refuses a locale the space does not have', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));

    await translationCommand.parseAsync(['diff', 'dee', '-p', 'de.json'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith("Locale 'dee' is not in this space. Available locales: en, de");
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(getTranslations).not.toHaveBeenCalled();
  });

  it('skips the locale check when the token cannot read the space', async () => {
    getSpace.mockRejectedValue(new Error('forbidden'));
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'nav.home': 'Home' }));
    getTranslations.mockResolvedValue({ 'nav.home': 'Home' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'en.json'], { from: 'user' });

    expect(getTranslations).toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  it('labels sections from neither side’s point of view', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ 'only.file': 'A', both: 'local' }));
    getTranslations.mockResolvedValue({ both: 'remote', 'only.localess': 'B' });

    await translationCommand.parseAsync(['diff', 'en', '-p', 'en.json'], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Only in file (1)'))).toBe(true);
    expect(logs.some(line => line.includes('Different (1)'))).toBe(true);
    expect(logs.some(line => line.includes('Only in Localess (1)'))).toBe(true);
  });

  it('explains a 404 on --raw as a platform too old', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({}));
    const { LocalessApiError } = await import('../../../models');
    getTranslationValues.mockRejectedValue(new LocalessApiError(404, 'Not Found', 'url', undefined, 'hint'));

    await translationCommand.parseAsync(['diff', 'de', '-p', 'de.json', '--raw'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('newer than 4.0.0'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
