import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { schemaCommand } from '../index';

function writeEntry(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'localess-validate-'));
  const entry = join(dir, 'schemas.ts');
  writeFileSync(entry, source);
  return entry;
}

describe('schema validate', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('exits 0 for a valid config', async () => {
    const entry = writeEntry(
      `export const config = { schemas: [{ id: 'Button', type: 'NODE' as const, fields: [{ name: 'label', kind: 'TEXT' as const }] }] };`
    );
    await schemaCommand.parseAsync(['validate', entry], { from: 'user' });
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('exits 1 and prints issues for an invalid config', async () => {
    const entry = writeEntry(`export const config = { schemas: [{ id: '1bad', type: 'NODE' as const }] };`);
    await schemaCommand.parseAsync(['validate', entry], { from: 'user' });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('prints JSON with --format json', async () => {
    const logSpy = vi.mocked(console.log);
    const entry = writeEntry(`export const config = { schemas: [{ id: '1bad', type: 'NODE' as const }] };`);
    await schemaCommand.parseAsync(['validate', entry, '--format', 'json'], { from: 'user' });
    const printed = logSpy.mock.calls.map(args => args.join(' ')).join('\n');
    expect(() => JSON.parse(printed)).not.toThrow();
  });

  it('exits 1 with a helpful error when the entry file has no schema config', async () => {
    const errorSpy = vi.mocked(console.error);
    const entry = writeEntry(`export const nothing = 42;`);
    await schemaCommand.parseAsync(['validate', entry], { from: 'user' });
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith('Failed to validate schemas:', expect.stringContaining('No Localess schema config'));
  });
});
