import { describe, expect, it } from 'vitest';

import { defineConfig, defineEnum, defineSchema } from './define';
import { toSchemaExport } from './export';

describe('toSchemaExport', () => {
  it('emits wire-shaped exports and preserves order', () => {
    const ButtonType = defineEnum({ id: 'ButtonType', values: [{ name: 'P', value: 'primary' }] });
    const Button = defineSchema({
      id: 'Button',
      type: 'NODE',
      displayName: 'Button',
      fields: [{ name: 'kind', kind: 'OPTION', source: ButtonType }],
    });
    expect(toSchemaExport(defineConfig({ schemas: [Button, ButtonType] }))).toEqual([
      { id: 'Button', type: 'NODE', displayName: 'Button', fields: [{ name: 'kind', kind: 'OPTION', source: 'ButtonType' }] },
      { id: 'ButtonType', type: 'ENUM', values: [{ name: 'P', value: 'primary' }] },
    ]);
  });

  it('drops undefined-valued keys', () => {
    const Bare = defineSchema({ id: 'Bare', type: 'NODE', displayName: undefined });
    const [exported] = toSchemaExport(defineConfig({ schemas: [Bare] }));
    expect('displayName' in exported).toBe(false);
    expect('fields' in exported).toBe(false);
  });

  it('round-trips through JSON unchanged', () => {
    const Page = defineSchema({
      id: 'Page',
      type: 'ROOT',
      previewField: 'title',
      fields: [
        { name: 'title', kind: 'TEXT', required: true, translatable: true, maxLength: 50 },
        { name: 'blocks', kind: 'SCHEMAS', schemas: ['Button'] },
      ],
    });
    const exported = toSchemaExport(defineConfig({ schemas: [Page] }));
    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });

  it('returns an empty array for an empty config', () => {
    expect(toSchemaExport(defineConfig({ schemas: [] }))).toEqual([]);
  });
});
