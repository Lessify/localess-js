import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSchemas = vi.fn();
const pushSchemas = vi.fn();
vi.mock('../../../client', () => ({ localessCliClient: () => ({ getSchemas, pushSchemas }) }));
vi.mock('../../../session', () => ({
  getSession: async () => ({ isLoggedIn: true, token: 't'.repeat(20), space: 'space1', origin: 'http://localhost' }),
}));
vi.mock('@inquirer/prompts', () => ({ confirm: vi.fn().mockResolvedValue(true) }));

import { confirm } from '@inquirer/prompts';

import { schemaCommand } from '../index';

function writeEntry(): string {
  const dir = mkdtempSync(join(tmpdir(), 'localess-push-'));
  const entry = join(dir, 'schemas.ts');
  writeFileSync(
    entry,
    `export const config = { schemas: [{ id: 'Button', type: 'NODE' as const, fields: [{ name: 'label', kind: 'TEXT' as const }] }] };`
  );
  return entry;
}

const okResponse = {
  message: 'ok',
  counts: { created: 1, updated: 0, deleted: 0, unchanged: 0 },
  ids: { created: ['Button'], updated: [], deleted: [] },
};

describe('schema push', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getSchemas.mockReset().mockResolvedValue([]);
    pushSchemas.mockReset().mockResolvedValue(okResponse);
    vi.mocked(confirm).mockReset().mockResolvedValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('pushes with type upsert by default', async () => {
    await schemaCommand.parseAsync(['push', writeEntry()], { from: 'user' });
    expect(pushSchemas).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'upsert', schemas: [expect.objectContaining({ id: 'Button' })] })
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it('passes dryRun through', async () => {
    await schemaCommand.parseAsync(['push', writeEntry(), '--dry-run'], { from: 'user' });
    expect(pushSchemas).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  });

  it('uses type sync and asks for confirmation with --delete', async () => {
    getSchemas.mockResolvedValue([{ id: 'Stale', type: 'NODE' }]);
    await schemaCommand.parseAsync(['push', writeEntry(), '--delete'], { from: 'user' });
    expect(confirm).toHaveBeenCalled();
    expect(pushSchemas).toHaveBeenCalledWith(expect.objectContaining({ type: 'sync' }));
  });

  it('skips confirmation with --delete --yes', async () => {
    getSchemas.mockResolvedValue([{ id: 'Stale', type: 'NODE' }]);
    await schemaCommand.parseAsync(['push', writeEntry(), '--delete', '--yes'], { from: 'user' });
    expect(confirm).not.toHaveBeenCalled();
    expect(pushSchemas).toHaveBeenCalled();
  });

  it('does not prompt for --delete when there is nothing stale', async () => {
    getSchemas.mockResolvedValue([]);
    await schemaCommand.parseAsync(['push', writeEntry(), '--delete'], { from: 'user' });
    expect(confirm).not.toHaveBeenCalled();
    expect(pushSchemas).toHaveBeenCalledWith(expect.objectContaining({ type: 'sync' }));
  });

  it('aborts and does not push when the deletion confirmation is declined', async () => {
    getSchemas.mockResolvedValue([{ id: 'Stale', type: 'NODE' }]);
    vi.mocked(confirm).mockResolvedValueOnce(false);
    await schemaCommand.parseAsync(['push', writeEntry(), '--delete'], { from: 'user' });
    expect(pushSchemas).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('prints unchanged schemas with --all', async () => {
    getSchemas.mockResolvedValue([{ id: 'Button', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT' }] }]);
    await schemaCommand.parseAsync(['push', writeEntry(), '--all'], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Unchanged (1)'))).toBe(true);
  });

  it('warns when the server result does not match the local prediction', async () => {
    pushSchemas.mockResolvedValue({
      message: 'ok',
      counts: { created: 0, updated: 0, deleted: 0, unchanged: 1 },
      ids: { created: [], updated: [], deleted: [] },
    });
    await schemaCommand.parseAsync(['push', writeEntry()], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Prediction mismatch'))).toBe(true);
    expect(logs.some(line => line.includes('Button: predicted "create", server reported "unchanged"'))).toBe(true);
  });

  it('does not warn when the server result matches the local prediction', async () => {
    await schemaCommand.parseAsync(['push', writeEntry()], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Prediction mismatch'))).toBe(false);
  });

  it('aborts without pushing when validation fails', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'localess-push-'));
    const entry = join(dir, 'schemas.ts');
    writeFileSync(entry, `export const config = { schemas: [{ id: '1bad', type: 'NODE' as const }] };`);
    await schemaCommand.parseAsync(['push', entry], { from: 'user' });
    expect(pushSchemas).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
