import { describe, expect, it } from 'vitest';

import type { SchemaExport, SchemaField } from '../../../models';
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

  it('prints an enum values array with one value per line', () => {
    const files = emitSchemaFiles([
      {
        id: 'ButtonType',
        type: 'ENUM',
        displayName: 'Button Type',
        values: [
          { name: 'Primary', value: 'primary' },
          { name: 'Secondary', value: 'secondary' },
        ],
      },
    ]);
    const buttonType = files.get('button-type.ts')!;
    expect(buttonType).toContain(
      "values: [\n    { name: 'Primary', value: 'primary' },\n    { name: 'Secondary', value: 'secondary' },\n  ],"
    );
  });

  it('keeps a single-value enum values array on one line entry, still using the array form', () => {
    const files = emitSchemaFiles([{ id: 'Solo', type: 'ENUM', values: [{ name: 'Only', value: 'only' }] }]);
    expect(files.get('solo.ts')).toContain("values: [\n    { name: 'Only', value: 'only' },\n  ],");
  });

  it('prints an empty values array inline', () => {
    const files = emitSchemaFiles([{ id: 'Empty2', type: 'ENUM', values: [] }]);
    expect(files.get('empty2.ts')).toContain('values: [],');
  });

  it('keeps primitive arrays (e.g. labels) inline, not one per line', () => {
    const files = emitSchemaFiles([{ id: 'Labeled', type: 'NODE', labels: ['button', 'ui'] }]);
    expect(files.get('labeled.ts')).toContain("labels: ['button', 'ui'],");
  });

  it('wraps each field in defineField instead of a bare object literal', () => {
    const files = emitSchemaFiles(schemas);
    const button = files.get('button.ts')!;
    expect(button).toContain(`import { defineField, defineSchema } from '@localess/schema';`);
    expect(button).toContain(`defineField({ name: 'label', kind: 'TEXT', required: true, maxLength: 50 }),`);
    expect(button).toContain(`defineField({ name: 'kind', kind: 'OPTION', source: ButtonType }),`);
  });

  it('wraps a defineField call onto multiple lines when it would exceed the print width', () => {
    const files = emitSchemaFiles([
      {
        id: 'Button',
        type: 'NODE',
        fields: [
          // Deliberately scrambled key order — output must follow the UI order regardless.
          {
            maxLength: 30,
            defaultValue: 'CTA',
            description: 'Text that will appear inside the button',
            minLength: 3,
            kind: 'TEXT',
            translatable: true,
            required: true,
            displayName: 'Label',
            name: 'label',
          },
        ],
      },
    ]);
    const button = files.get('button.ts')!;
    expect(button).toContain(
      [
        '    defineField({',
        "      name: 'label',",
        "      kind: 'TEXT',",
        "      displayName: 'Label',",
        '      required: true,',
        '      translatable: true,',
        "      description: 'Text that will appear inside the button',",
        "      defaultValue: 'CTA',",
        '      minLength: 3,',
        '      maxLength: 30,',
        '    }),',
      ].join('\n')
    );
  });

  it('orders defineField properties to match the Localess editor UI, not the wire object\'s own key order', () => {
    // Scrambled input covering every ordered property (incl. fileTypes, adjacent to fileType
    // though not explicitly requested — dropping it from the order list would still print it,
    // just last, so this pins it as intentionally placed rather than an accidental leftover).
    const field = {
      fileTypes: ['IMAGE'],
      fileType: 'IMAGE',
      path: 'a/b',
      schemas: ['Other'],
      source: 'SomeEnum',
      maxValues: 5,
      minValues: 1,
      maxLength: 10,
      minLength: 2,
      maxValue: 100,
      minValue: 0,
      defaultValue: 'x',
      description: 'd',
      translatable: true,
      required: true,
      displayName: 'D',
      kind: 'TEXT',
      name: 'n',
    } as unknown as SchemaField;
    const files = emitSchemaFiles([{ id: 'X', type: 'NODE', fields: [field] }]);
    const content = files.get('x.ts')!;
    const order = [
      'name',
      'kind',
      'displayName',
      'required',
      'translatable',
      'description',
      'defaultValue',
      'minValue',
      'maxValue',
      'minLength',
      'maxLength',
      'minValues',
      'maxValues',
      'source',
      'schemas',
      'path',
      'fileType',
      'fileTypes',
    ];
    const positions = order.map(key => content.indexOf(`${key}:`));
    expect(positions.every(p => p !== -1)).toBe(true);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('keeps a short defineField call on one line', () => {
    const files = emitSchemaFiles([{ id: 'Button', type: 'NODE', fields: [{ name: 'link', kind: 'LINK' }] }]);
    expect(files.get('button.ts')).toContain(`    defineField({ name: 'link', kind: 'LINK' }),`);
  });

  it('respects a custom printWidth instead of a hardcoded value', () => {
    const mediumField: SchemaExport[] = [
      {
        id: 'Button',
        type: 'NODE',
        fields: [{ name: 'type', kind: 'OPTION', displayName: 'Type', required: true, source: 'ButtonType' }],
      },
    ];
    // Under the default (80): wraps. Under a wider printWidth (140): stays on one line.
    const atDefault = emitSchemaFiles(mediumField).get('button.ts')!;
    expect(atDefault).toContain('defineField({\n');
    const atWide = emitSchemaFiles(mediumField, 140).get('button.ts')!;
    expect(atWide).toContain(
      `    defineField({ name: 'type', kind: 'OPTION', displayName: 'Type', required: true, source: 'ButtonType' }),`
    );
  });

  it('does not import defineField for a schema with no fields', () => {
    const files = emitSchemaFiles([{ id: 'Empty', type: 'NODE' }]);
    const empty = files.get('empty.ts')!;
    expect(empty).toContain(`import { defineSchema } from '@localess/schema';`);
    expect(empty).not.toContain('defineField');
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
