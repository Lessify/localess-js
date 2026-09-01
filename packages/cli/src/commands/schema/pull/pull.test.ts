import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSchemas = vi.fn();
vi.mock('../../../client', () => ({ localessCliClient: () => ({ getSchemas }) }));
vi.mock('../../../session', () => ({
  getSession: async () => ({ isLoggedIn: true, token: 't'.repeat(20), space: 'space1', origin: 'http://localhost' }),
}));

import { schemaCommand } from '../index';
import { PULL_MARKER } from './emitter';

describe('schema pull', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'localess-pull-'));
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('writes definition files and index.ts', async () => {
    getSchemas.mockResolvedValue([{ id: 'Button', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT' }] }]);
    await schemaCommand.parseAsync(['pull', '--path', dir], { from: 'user' });
    expect(readdirSync(dir).sort()).toEqual(['button.ts', 'index.ts']);
    expect(readFileSync(join(dir, 'button.ts'), 'utf8')).toContain('defineSchema');
  });

  it('deletes stale marked files and preserves unmarked files', async () => {
    writeFileSync(join(dir, 'old.ts'), `${PULL_MARKER}\n// previously pulled`);
    writeFileSync(join(dir, 'mine.ts'), `// my helper, no marker`);
    getSchemas.mockResolvedValue([]);
    await schemaCommand.parseAsync(['pull', '--path', dir], { from: 'user' });
    const names = readdirSync(dir);
    expect(names).not.toContain('old.ts');
    expect(names).toContain('mine.ts');
  });

  it('overwrites a previously pulled file whose content changed', async () => {
    writeFileSync(join(dir, 'button.ts'), `${PULL_MARKER}\n// old content`);
    getSchemas.mockResolvedValue([{ id: 'Button', type: 'NODE', fields: [] }]);
    await schemaCommand.parseAsync(['pull', '--path', dir], { from: 'user' });
    expect(readFileSync(join(dir, 'button.ts'), 'utf8')).toContain('defineSchema');
  });

  it('skips a same-named file that lacks the marker and reports it', async () => {
    writeFileSync(join(dir, 'button.ts'), `// hand-written, not from pull`);
    getSchemas.mockResolvedValue([{ id: 'Button', type: 'NODE', fields: [] }]);
    const warnSpy = vi.mocked(console.warn);
    await schemaCommand.parseAsync(['pull', '--path', dir], { from: 'user' });
    expect(readFileSync(join(dir, 'button.ts'), 'utf8')).toBe('// hand-written, not from pull');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('button.ts'));
  });
});
