import { describe, expectTypeOf, it } from 'vitest';

import { defineEnum, defineSchema } from './define';

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
