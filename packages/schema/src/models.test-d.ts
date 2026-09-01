import { describe, expectTypeOf, it } from 'vitest';

import type { SchemaExport, SchemaField } from './models';

describe('wire models', () => {
  it('narrows fields by kind', () => {
    const field: SchemaField = { name: 'price', kind: 'NUMBER', minValue: 0 };
    expectTypeOf(field).toMatchTypeOf<SchemaField>();
    // @ts-expect-error maxLength is not valid on a NUMBER field
    const bad: SchemaField = { name: 'price', kind: 'NUMBER', maxLength: 5 };
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
