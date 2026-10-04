import { describe, expectTypeOf, it } from 'vitest';

import type { SchemaEnumValue, SchemaExport, SchemaField, TranslatableSchemaFieldKind } from './models';

describe('wire models', () => {
  it('narrows fields by kind', () => {
    const field: SchemaField = { name: 'price', kind: 'NUMBER', minValue: 0 };
    expectTypeOf(field).toMatchTypeOf<SchemaField>();
    // @ts-expect-error maxLength is not valid on a NUMBER field
    const bad: SchemaField = { name: 'price', kind: 'NUMBER', maxLength: 5 };
    void bad;
  });
  it('narrows OPTION requiring source', () => {
    const field: SchemaField = { name: 'kind', kind: 'OPTION', source: 'Type' };
    expectTypeOf(field).toMatchTypeOf<SchemaField>();
    // @ts-expect-error source is required on an OPTION field
    const bad: SchemaField = { name: 'kind', kind: 'OPTION' };
    void bad;
  });
  it('narrows LINK with no extra properties', () => {
    const field: SchemaField = { name: 'cta', kind: 'LINK' };
    expectTypeOf(field).toMatchTypeOf<SchemaField>();
    // @ts-expect-error path is not valid on a LINK field (that belongs to REFERENCE/REFERENCES)
    const bad: SchemaField = { name: 'cta', kind: 'LINK', path: 'x' };
    void bad;
  });
  it('narrows ASSET to a closed fileType literal union', () => {
    const field: SchemaField = { name: 'hero', kind: 'ASSET', fileType: 'IMAGE' };
    expectTypeOf(field).toMatchTypeOf<SchemaField>();
    // @ts-expect-error 'PDF' is not a valid AssetFileType
    const bad: SchemaField = { name: 'hero', kind: 'ASSET', fileType: 'PDF' };
    void bad;
  });
  it('carries translatable only on translatable kinds', () => {
    const text: SchemaField = { name: 'title', kind: 'TEXT', translatable: true };
    const asset: SchemaField = { name: 'image', kind: 'ASSET', translatable: true };
    void text;
    void asset;
    // @ts-expect-error translatable is not valid on a REFERENCE field
    const reference: SchemaField = { name: 'author', kind: 'REFERENCE', translatable: true };
    // @ts-expect-error translatable is not valid on a SCHEMAS field
    const blocks: SchemaField = { name: 'blocks', kind: 'SCHEMAS', schemas: ['Leaf'], translatable: true };
    void reference;
    void blocks;
  });
  it('TranslatableSchemaFieldKind matches the kinds whose interface has translatable', () => {
    type KindsWithTranslatable =
      Extract<SchemaField, { translatable?: boolean }> extends infer F
        ? F extends { kind: infer K }
          ? 'translatable' extends keyof F
            ? K
            : never
          : never
        : never;
    expectTypeOf<TranslatableSchemaFieldKind>().toEqualTypeOf<KindsWithTranslatable>();
  });
  it('requires name and value strings on SchemaEnumValue', () => {
    const value: SchemaEnumValue = { name: 'Primary', value: 'primary' };
    expectTypeOf(value).toMatchTypeOf<SchemaEnumValue>();
    // @ts-expect-error value must be a string
    const bad: SchemaEnumValue = { name: 'Primary', value: 1 };
    void bad;
  });
  it('discriminates export by type', () => {
    const e: SchemaExport = { id: 'ButtonType', type: 'ENUM', values: [{ name: 'A', value: 'a' }] };
    // @ts-expect-error fields is not valid on an ENUM export
    const bad: SchemaExport = { id: 'ButtonType', type: 'ENUM', fields: [] };
    void e;
    void bad;
  });
});
