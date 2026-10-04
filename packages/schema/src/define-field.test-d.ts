import { describe, expectTypeOf, it } from 'vitest';

import type { SchemaFieldInput } from './define';
import { defineEnum, defineField, defineSchema } from './define';

describe('defineField type-level behavior', () => {
  it('preserves literal types for name/kind/numeric extras', () => {
    const f = defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 });
    expectTypeOf(f.name).toEqualTypeOf<'amount'>();
    expectTypeOf(f.kind).toEqualTypeOf<'NUMBER'>();
    expectTypeOf(f.minValue).toEqualTypeOf<0>();
  });

  it('catches a mismatched kind extra at the call site (NUMBER)', () => {
    // @ts-expect-error maxLength is not valid on a NUMBER field
    defineField({ name: 'amount', kind: 'NUMBER', maxLength: 5 });
  });

  it('catches a mismatched kind extra at the call site (TEXT)', () => {
    // @ts-expect-error minValue is not valid on a TEXT field
    defineField({ name: 'label', kind: 'TEXT', minValue: 0 });
  });

  it('still requires OPTION.source', () => {
    // @ts-expect-error source is required on OPTION fields
    defineField({ name: 'opt', kind: 'OPTION' });
  });

  it('requires SCHEMA/SCHEMAS.schemas', () => {
    // @ts-expect-error schemas is required on SCHEMA fields
    defineField({ name: 'hero', kind: 'SCHEMA' });
    // @ts-expect-error schemas is required on SCHEMAS fields
    defineField({ name: 'blocks', kind: 'SCHEMAS' });
  });

  it('rejects translatable on kinds the editor never translates', () => {
    // @ts-expect-error translatable is not valid on a REFERENCE field
    defineField({ name: 'author', kind: 'REFERENCE', translatable: true });
    // @ts-expect-error translatable is not valid on a REFERENCES field
    defineField({ name: 'related', kind: 'REFERENCES', translatable: true });
    // @ts-expect-error translatable is not valid on a SCHEMA field
    defineField({ name: 'hero', kind: 'SCHEMA', schemas: ['Leaf'], translatable: true });
    // @ts-expect-error translatable is not valid on a SCHEMAS field
    defineField({ name: 'blocks', kind: 'SCHEMAS', schemas: ['Leaf'], translatable: true });
  });

  it('still allows translatable on other kinds', () => {
    defineField({ name: 'title', kind: 'TEXT', translatable: true });
    defineField({ name: 'image', kind: 'ASSET', translatable: true });
  });

  it('preserves the by-value enum ref literal on source', () => {
    const ButtonType = defineEnum({ id: 'ButtonType', values: [{ name: 'P', value: 'primary' }] });
    const f = defineField({ name: 'kind', kind: 'OPTION', source: ButtonType });
    expectTypeOf(f.source).toEqualTypeOf<typeof ButtonType>();
  });

  it('preserves a by-value SCHEMAS ref array literal, normalized through defineSchema', () => {
    const Leaf = defineSchema({ id: 'Leaf', type: 'NODE' });
    const Twig = defineSchema({ id: 'Twig', type: 'NODE' });
    const f = defineField({ name: 'children', kind: 'SCHEMAS', schemas: [Leaf, Twig] });
    expectTypeOf(f.schemas).toEqualTypeOf<readonly [typeof Leaf, typeof Twig]>();

    const Branch = defineSchema({ id: 'Branch', type: 'NODE', fields: [f] });
    expectTypeOf(Branch.fields[0].schemas).toEqualTypeOf<['Leaf', 'Twig']>();
  });

  it('is directly usable as a defineSchema fields[] element, mixed with raw literals', () => {
    const f = defineField({ name: 'amount', kind: 'NUMBER', minValue: 0 });
    const fields: readonly SchemaFieldInput[] = [f, { name: 'label', kind: 'TEXT' }];
    void fields;
  });
});
