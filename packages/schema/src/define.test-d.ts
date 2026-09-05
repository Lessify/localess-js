import { describe, expectTypeOf, it } from 'vitest';

import { defineEnum, defineField, defineSchema } from './define';

describe('define type-level behavior', () => {
  it('preserves literals and normalizes refs to id literals', () => {
    const ButtonType = defineEnum({ id: 'ButtonType', values: [{ name: 'P', value: 'primary' }] });
    const Button = defineSchema({
      id: 'Button',
      type: 'NODE',
      fields: [{ name: 'kind', kind: 'OPTION', source: ButtonType }],
    });
    expectTypeOf(Button.id).toEqualTypeOf<'Button'>();
    expectTypeOf(Button.fields[0].source).toEqualTypeOf<'ButtonType'>();
  });

  it('narrows per-kind extras', () => {
    // @ts-expect-error source is required on OPTION fields
    defineSchema({ id: 'Bad2', type: 'NODE', fields: [{ name: 'opt', kind: 'OPTION' }] });
  });

  it('normalizes an OPTIONS by-value ref to its id literal', () => {
    const StatusType = defineEnum({ id: 'StatusType', values: [{ name: 'D', value: 'draft' }] });
    const Card = defineSchema({
      id: 'Card',
      type: 'NODE',
      fields: [{ name: 'tags', kind: 'OPTIONS', source: StatusType }],
    });
    expectTypeOf(Card.fields[0].source).toEqualTypeOf<'StatusType'>();
  });

  it('narrows OPTIONS requiring source', () => {
    // @ts-expect-error source is required on OPTIONS fields
    defineSchema({ id: 'Bad3', type: 'NODE', fields: [{ name: 'tags', kind: 'OPTIONS' }] });
  });

  it('normalizes SCHEMAS by-value refs to id literals', () => {
    const Leaf = defineSchema({ id: 'Leaf', type: 'NODE' });
    const Twig = defineSchema({ id: 'Twig', type: 'NODE' });
    const Branch = defineSchema({
      id: 'Branch',
      type: 'NODE',
      fields: [{ name: 'children', kind: 'SCHEMAS', schemas: [Leaf, Twig] }],
    });
    expectTypeOf(Branch.fields[0].schemas).toEqualTypeOf<['Leaf', 'Twig']>();
  });

  it('restricts previewField to one of the schema\'s own field names', () => {
    const ButtonType = defineEnum({ id: 'ButtonType', values: [{ name: 'P', value: 'primary' }] });
    defineSchema({
      id: 'Button',
      type: 'NODE',
      previewField: 'label',
      fields: [
        defineField({ name: 'label', kind: 'TEXT', required: true }),
        defineField({ name: 'type', kind: 'OPTION', required: true, source: ButtonType }),
      ],
    });
  });

  it('rejects a previewField that does not match any field name', () => {
    defineSchema({
      id: 'Button',
      type: 'NODE',
      fields: [{ name: 'label', kind: 'TEXT' }],
      // @ts-expect-error 'lbel' is not a name of any field in this schema
      previewField: 'lbel',
    });
  });

  it('rejects a previewField from another schema (no cross-schema leakage)', () => {
    defineSchema({
      id: 'Page',
      type: 'ROOT',
      fields: [{ name: 'title', kind: 'TEXT' }],
      // @ts-expect-error 'label' belongs to a different schema, not this one's fields
      previewField: 'label',
    });
  });

  it('falls back to plain string when fields is omitted', () => {
    defineSchema({ id: 'Empty', type: 'NODE', previewField: 'anything' });
  });

  it('rejects a mismatched kind extra when the field is checked directly against SchemaFieldInput', () => {
    // Known TypeScript limitation (also documented by Sanity for their unwrapped array fields):
    // excess-property checks don't apply to object literals inside an array assigned through a
    // `const`-inferred generic parameter, only to literals checked directly against a declared
    // type. defineSchema's `fields` therefore won't flag a stray `maxLength` on a NUMBER field at
    // the call site — but a bare field literal checked directly against SchemaFieldInput still does.
    const badField: import('./define').SchemaFieldInput = {
      name: 'num',
      kind: 'NUMBER',
      // @ts-expect-error maxLength is not valid on a NUMBER field
      maxLength: 5,
    };
    void badField;
  });
});
