import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSchemas = vi.fn();
vi.mock('../../../client', () => ({ localessCliClient: () => ({ getSchemas }) }));
vi.mock('../../../session', () => ({
  getSession: async () => ({ isLoggedIn: true, token: 't'.repeat(20), space: 'space1', origin: 'http://localhost' }),
}));

import { schemaCommand } from '../index';

function writeEntry(): string {
  const dir = mkdtempSync(join(tmpdir(), 'localess-diff-'));
  const entry = join(dir, 'schemas.ts');
  writeFileSync(
    entry,
    `export const config = { schemas: [{ id: 'Button', type: 'NODE' as const, fields: [{ name: 'label', kind: 'TEXT' as const }] }] };`
  );
  return entry;
}

describe('schema diff', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getSchemas.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('exits 0 when everything is unchanged', async () => {
    getSchemas.mockResolvedValue([{ id: 'Button', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT' }] }]);
    await schemaCommand.parseAsync(['diff', writeEntry()], { from: 'user' });
    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  it('exits 1 on drift', async () => {
    getSchemas.mockResolvedValue([]);
    await schemaCommand.parseAsync(['diff', writeEntry()], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits 1 when the remote has a stale schema not present locally', async () => {
    getSchemas.mockResolvedValue([
      { id: 'Button', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT' }] },
      { id: 'Stale', type: 'NODE' },
    ]);
    await schemaCommand.parseAsync(['diff', writeEntry()], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('groups output by status and omits unchanged schemas by default', async () => {
    getSchemas.mockResolvedValue([
      { id: 'Button', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT', required: true }] },
      { id: 'Stale', type: 'NODE' },
    ]);
    await schemaCommand.parseAsync(['diff', writeEntry()], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Update (1)'))).toBe(true);
    expect(logs.some(line => line.includes('Button'))).toBe(true);
    expect(logs.some(line => line.includes('Stale (1)'))).toBe(true);
    expect(logs.some(line => line.includes('Unchanged'))).toBe(false);
  });

  it('also prints unchanged schemas with --all', async () => {
    getSchemas.mockResolvedValue([{ id: 'Button', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT' }] }]);
    await schemaCommand.parseAsync(['diff', writeEntry(), '--all'], { from: 'user' });

    const logs = vi.mocked(console.log).mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Unchanged (1)'))).toBe(true);
    expect(logs.some(line => line.includes('Button'))).toBe(true);
  });
});
