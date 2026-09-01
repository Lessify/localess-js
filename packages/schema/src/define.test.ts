import { describe, expect, it } from 'vitest';

import { defineConfig, defineEnum, defineSchema } from './define';

const ButtonType = defineEnum({
  id: 'ButtonType',
  values: [
    { name: 'Primary', value: 'primary' },
    { name: 'Secondary', value: 'secondary' },
  ],
});

describe('defineEnum', () => {
  it('injects type ENUM and returns the definition', () => {
    expect(ButtonType.type).toBe('ENUM');
    expect(ButtonType.id).toBe('ButtonType');
  });
});

describe('defineSchema', () => {
  it('normalizes by-value enum refs in OPTION source to the enum id', () => {
    const Button = defineSchema({
      id: 'Button',
      type: 'NODE',
      fields: [{ name: 'kind', kind: 'OPTION', source: ButtonType }],
    });
    expect(Button.fields?.[0]).toEqual({ name: 'kind', kind: 'OPTION', source: 'ButtonType' });
  });

  it('normalizes by-value schema refs in SCHEMAS to id strings, mixed with plain strings', () => {
    const Button = defineSchema({ id: 'Button', type: 'NODE', fields: [] });
    const Page = defineSchema({
      id: 'Page',
      type: 'ROOT',
      fields: [{ name: 'blocks', kind: 'SCHEMAS', schemas: [Button, 'Section'] }],
    });
    expect(Page.fields?.[0]).toEqual({ name: 'blocks', kind: 'SCHEMAS', schemas: ['Button', 'Section'] });
  });

  it('throws on duplicate field names', () => {
    expect(() =>
      defineSchema({
        id: 'Bad',
        type: 'NODE',
        fields: [
          { name: 'label', kind: 'TEXT' },
          { name: 'label', kind: 'NUMBER' },
        ],
      })
    ).toThrow(/duplicate field/i);
  });
});

describe('defineConfig', () => {
  it('returns the config and throws on duplicate schema ids', () => {
    const A = defineSchema({ id: 'Alpha', type: 'NODE' });
    const config = defineConfig({ schemas: [A, ButtonType] });
    expect(config.schemas).toHaveLength(2);
    expect(() => defineConfig({ schemas: [A, defineSchema({ id: 'Alpha', type: 'ROOT' })] })).toThrow(/duplicate schema id/i);
  });
});
