import { describe, expect, it } from 'vitest';

import { defineField, defineSchema } from './define';

describe('defineField', () => {
  it('returns the field unchanged (identity function)', () => {
    const field = defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 });
    expect(field).toEqual({ name: 'amount', kind: 'NUMBER', minValue: 0 });
  });

  it('composes with defineSchema, including by-value ref normalization', () => {
    const schema = defineSchema({
      id: 'Price',
      type: 'NODE',
      fields: [defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 })],
    });
    expect(schema.fields).toEqual([{ name: 'amount', kind: 'NUMBER', minValue: 0 }]);
  });

  it('mixes with raw field literals in the same fields array', () => {
    const schema = defineSchema({
      id: 'Mixed',
      type: 'NODE',
      fields: [defineField({ name: 'amount', kind: 'NUMBER' }), { name: 'label', kind: 'TEXT' }],
    });
    expect(schema.fields?.map(field => field.name)).toEqual(['amount', 'label']);
  });
});
