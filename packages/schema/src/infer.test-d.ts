import { describe, expectTypeOf, it } from 'vitest';

import type { SchemaContentAsset, SchemaContentRichText } from './content-types';
import { defineConfig, defineEnum, defineSchema } from './define';
import type { InferContent, InferContentData, InferEnum } from './infer';

const ButtonType = defineEnum({
  id: 'ButtonType',
  values: [
    { name: 'Primary', value: 'primary' },
    { name: 'Secondary', value: 'secondary' },
  ],
});

const Button = defineSchema({
  id: 'Button',
  type: 'NODE',
  fields: [
    { name: 'label', kind: 'TEXT', required: true },
    { name: 'kind', kind: 'OPTION', source: ButtonType },
    { name: 'icon', kind: 'ASSET' },
  ],
});

const Section = defineSchema({
  id: 'Section',
  type: 'NODE',
  fields: [{ name: 'body', kind: 'RICH_TEXT' }],
});

const Page = defineSchema({
  id: 'Page',
  type: 'ROOT',
  fields: [
    { name: 'title', kind: 'TEXT', required: true },
    { name: 'count', kind: 'NUMBER' },
    { name: 'published', kind: 'BOOLEAN', required: true },
    { name: 'blocks', kind: 'SCHEMAS', schemas: [Button] },
    { name: 'any', kind: 'SCHEMA' },
  ],
});

const config = defineConfig({ schemas: [Page, Button, Section, ButtonType] });
void config;

describe('InferEnum', () => {
  it('is the literal union of values', () => {
    expectTypeOf<InferEnum<typeof ButtonType>>().toEqualTypeOf<'primary' | 'secondary'>();
  });
});

describe('InferContent', () => {
  type ButtonContent = InferContent<typeof Button, typeof config>;
  type PageContent = InferContent<typeof Page, typeof config>;

  it('adds _id and literal _schema', () => {
    expectTypeOf<ButtonContent['_id']>().toEqualTypeOf<string>();
    expectTypeOf<ButtonContent['_schema']>().toEqualTypeOf<'Button'>();
  });

  it('splits required vs optional and maps primitives', () => {
    expectTypeOf<PageContent['title']>().toEqualTypeOf<string>();
    expectTypeOf<PageContent['published']>().toEqualTypeOf<boolean>();
    expectTypeOf<PageContent['count']>().toEqualTypeOf<number | undefined>();
  });

  it('resolves OPTION to the referenced enum literal union', () => {
    expectTypeOf<ButtonContent['kind']>().toEqualTypeOf<'primary' | 'secondary' | undefined>();
  });

  it('maps structural content types', () => {
    expectTypeOf<ButtonContent['icon']>().toEqualTypeOf<SchemaContentAsset | undefined>();
    type SectionContent = InferContent<typeof Section, typeof config>;
    expectTypeOf<SectionContent['body']>().toEqualTypeOf<SchemaContentRichText | undefined>();
  });

  it('SCHEMAS resolves to the allowed schemas content array; unrestricted SCHEMA to all NODE content', () => {
    expectTypeOf<PageContent['blocks']>().toEqualTypeOf<ButtonContent[] | undefined>();
    type AnyBlock = NonNullable<PageContent['any']>;
    expectTypeOf<AnyBlock['_schema']>().toEqualTypeOf<'Button' | 'Section'>();
  });
});

describe('InferContentData', () => {
  it('is the union of ROOT content types', () => {
    type Content = InferContentData<typeof config>;
    expectTypeOf<Content['_schema']>().toEqualTypeOf<'Page'>();
  });
});
