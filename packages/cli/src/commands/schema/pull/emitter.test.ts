import { describe, expect, it } from 'vitest';

import type { SchemaExport } from '../../../models';
import { emitSchemaFiles, PULL_MARKER, toKebabCase } from './emitter';

describe('toKebabCase', () => {
  it('converts PascalCase ids to kebab-case file names', () => {
    expect(toKebabCase('ButtonType')).toBe('button-type');
    expect(toKebabCase('Page')).toBe('page');
  });
});

describe('emitSchemaFiles', () => {
  const schemas: SchemaExport[] = [
    { id: 'ButtonType', type: 'ENUM', values: [{ name: 'Primary', value: 'primary' }] },
    {
      id: 'Button',
      type: 'NODE',
      displayName: 'Button',
      fields: [
        { name: 'label', kind: 'TEXT', required: true, maxLength: 50 },
        { name: 'kind', kind: 'OPTION', source: 'ButtonType' },
      ],
    },
    { id: 'Page', type: 'ROOT', fields: [{ name: 'blocks', kind: 'SCHEMAS', schemas: ['Button'] }] },
  ];

  it('emits one file per schema plus index.ts, each with the marker', () => {
    const files = emitSchemaFiles(schemas);
    expect([...files.keys()].sort()).toEqual(['button-type.ts', 'button.ts', 'index.ts', 'page.ts']);
    for (const content of files.values()) {
      expect(content.startsWith(PULL_MARKER)).toBe(true);
    }
  });

  it('emits by-value refs as imports of the referenced definitions', () => {
    const files = emitSchemaFiles(schemas);
    const button = files.get('button.ts')!;
    expect(button).toContain(`import { ButtonType } from './button-type';`);
    expect(button).toContain('source: ButtonType');
    const page = files.get('page.ts')!;
    expect(page).toContain(`import { Button } from './button';`);
    expect(page).toContain('schemas: [Button]');
  });

  it('keeps unresolvable refs as strings', () => {
    const files = emitSchemaFiles([{ id: 'Lone', type: 'NODE', fields: [{ name: 'blocks', kind: 'SCHEMAS', schemas: ['Ghost'] }] }]);
    expect(files.get('lone.ts')).toContain(`schemas: ['Ghost']`);
  });

  it('index.ts exports a defineConfig with every schema', () => {
    const index = emitSchemaFiles(schemas).get('index.ts')!;
    expect(index).toContain(`import { defineConfig } from '@localess/schema';`);
    expect(index).toContain('export const config = defineConfig({');
    expect(index).toContain('schemas: [ButtonType, Button, Page]');
  });

  it('is deterministic', () => {
    const a = emitSchemaFiles(schemas);
    const b = emitSchemaFiles(schemas);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('emits required fields without a required:false counterpart and preserves other props', () => {
    const files = emitSchemaFiles(schemas);
    const button = files.get('button.ts')!;
    expect(button).toContain('required: true');
    expect(button).toContain('maxLength: 50');
  });

  it('round-trips: emitted files re-export the same SchemaExport[] (via loadSchemaConfig + toSchemaExport)', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { loadSchemaConfig } = await import('../loader');
    const { toSchemaExport } = await import('../schema-lib');
    const { stableStringify } = await import('../diff-schemas');

    // Created inside the package (not the OS tmpdir) so bare specifiers like '@localess/schema'
    // resolve via this package's own node_modules when jiti loads the generated index.ts.
    const dir = mkdtempSync(join(process.cwd(), '.tmp-pull-roundtrip-'));
    try {
      const files = emitSchemaFiles(schemas);
      for (const [name, content] of files) {
        writeFileSync(join(dir, name), content);
      }
      const config = await loadSchemaConfig(join(dir, 'index.ts'));
      const roundTripped = toSchemaExport(config);
      const sortById = (arr: SchemaExport[]) => [...arr].sort((a, b) => a.id.localeCompare(b.id));
      expect(stableStringify(sortById(roundTripped))).toEqual(stableStringify(sortById(schemas)));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
