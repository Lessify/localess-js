import { mkdtemp, readFile as nodeReadFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureGitignore, fileExists, readFile, writeFile } from './file';

describe('fileExists', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'localess-cli-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns false for a missing file', async () => {
    expect(await fileExists(join(dir, 'missing.txt'))).toBe(false);
  });

  it('returns true for an existing file', async () => {
    const filePath = join(dir, 'present.txt');
    await writeFile(filePath, 'hello');
    expect(await fileExists(filePath)).toBe(true);
  });
});

describe('writeFile / readFile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'localess-cli-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates missing parent directories and writes the file content', async () => {
    const filePath = join(dir, 'nested', 'deep', 'file.json');

    await writeFile(filePath, JSON.stringify({ a: 1 }));

    expect(await readFile(filePath)).toBe(JSON.stringify({ a: 1 }));
  });

  it('overwrites existing file content', async () => {
    const filePath = join(dir, 'file.txt');
    await writeFile(filePath, 'first');
    await writeFile(filePath, 'second');

    expect(await readFile(filePath)).toBe('second');
  });

  it('writes the file even when an explicit mode option is provided', async () => {
    const filePath = join(dir, 'secret.json');

    await writeFile(filePath, '{}', { mode: 0o600 });

    expect(await readFile(filePath)).toBe('{}');
  });
});

describe('ensureGitignore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'localess-cli-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates a .gitignore file with the entry when none exists', async () => {
    await ensureGitignore(dir, '.localess');

    const content = await nodeReadFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toBe('.localess\n');
  });

  it('appends the entry to an existing .gitignore that lacks a trailing newline', async () => {
    await writeFile(join(dir, '.gitignore'), 'node_modules');
    await ensureGitignore(dir, '.localess');

    const content = await nodeReadFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toBe('node_modules\n.localess\n');
  });

  it('appends the entry to an existing .gitignore that already ends with a newline', async () => {
    await writeFile(join(dir, '.gitignore'), 'node_modules\n');
    await ensureGitignore(dir, '.localess');

    const content = await nodeReadFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toBe('node_modules\n.localess\n');
  });

  it('does not duplicate an entry that is already present', async () => {
    await writeFile(join(dir, '.gitignore'), '.localess\n');
    await ensureGitignore(dir, '.localess');

    const content = await nodeReadFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toBe('.localess\n');
  });
});
