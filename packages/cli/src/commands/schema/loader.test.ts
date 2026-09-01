import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSchemaConfig, loadSchemaConfig } from './loader';

describe('isSchemaConfig', () => {
  it('accepts a defineConfig-shaped object', () => {
    expect(
      isSchemaConfig({
        schemas: [
          { id: 'Button', type: 'NODE' },
          { id: 'Kind', type: 'ENUM' },
        ],
      })
    ).toBe(true);
  });

  it('rejects non-objects, missing schemas, and malformed entries', () => {
    expect(isSchemaConfig(null)).toBe(false);
    expect(isSchemaConfig({})).toBe(false);
    expect(isSchemaConfig({ schemas: 'nope' })).toBe(false);
    expect(isSchemaConfig({ schemas: [{ id: 42, type: 'NODE' }] })).toBe(false);
    expect(isSchemaConfig({ schemas: [{ id: 'X1', type: 'WEIRD' }] })).toBe(false);
  });
});

describe('loadSchemaConfig', () => {
  it('loads a TS entry exporting a config', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'localess-schema-'));
    const entry = join(dir, 'index.ts');
    writeFileSync(
      entry,
      `export const config = { schemas: [{ id: 'Button', type: 'NODE' as const, fields: [{ name: 'label', kind: 'TEXT' as const }] }] };`
    );
    const config = await loadSchemaConfig(entry);
    expect(config.schemas[0].id).toBe('Button');
  });

  it('finds the default export when no named export matches', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'localess-schema-'));
    const entry = join(dir, 'default.ts');
    writeFileSync(entry, `export default { schemas: [{ id: 'Page', type: 'ROOT' as const }] };`);
    const config = await loadSchemaConfig(entry);
    expect(config.schemas[0].id).toBe('Page');
  });

  it('throws a helpful error when no config export exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'localess-schema-'));
    const entry = join(dir, 'empty.ts');
    writeFileSync(entry, `export const nothing = 42;`);
    await expect(loadSchemaConfig(entry)).rejects.toThrow(/No Localess schema config/);
  });
});
